import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

import * as iam from 'aws-cdk-lib/aws-iam';
import { AuthStack } from './auth-stack';
import { NagSuppressions } from 'cdk-nag';
import { LambdaStack, LambdaDefinition } from './lambda-stack';
import { LookupRouteStack } from './routes/lookup-routes';
import { CoreRouteStack } from './routes/core-routes';
import { OperationsRouteStack } from './routes/operations-routes';

interface InfraStackProps extends cdk.StackProps {
  auth: AuthStack;
  stageName: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // ─── 1. DynamoDB Table ───
    const table = new dynamodb.Table(this, 'VersaTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'gsi2',
      partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 1b. DB Seed Custom Resource
    const seedLambda = new nodejs.NodejsFunction(this, 'seedDataLambda', {
      functionName: `Versa-seedData-${props.stageName}`,
      entry: path.join(__dirname, '../../backend/src/handlers/seedData.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      environment: { TABLE_NAME: table.tableName },
      bundling: { minify: true, sourceMap: true },
    });
    table.grantWriteData(seedLambda);

    new cdk.CustomResource(this, 'SeedDataResource', {
      serviceToken: seedLambda.functionArn,
      properties: { Version: '2' },
    });

    // ─── 2. SNS Alarm Topic ───
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `Versa-AlarmTopic-${props.stageName}`,
      displayName: `${props.stageName} Service Alarms`,
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'Subscribe to this topic for alarm notifications',
    });

    // ─── 3. Dead Letter Queues ───
    const lambdaDLQ = new sqs.Queue(this, 'LambdaDLQ', {
      queueName: `Versa-LambdaDLQ-${props.stageName}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    const dlqAlarm = new cloudwatch.Alarm(this, 'DLQMessagesAlarm', {
      metric: lambdaDLQ.metricApproximateNumberOfMessagesVisible({ period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'Messages in Lambda DLQ — indicates Lambda failures',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dlqAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    // ─── 4. API Gateway ───
    const api = new apigateway.RestApi(this, 'VersaApi', {
      restApiName: `Versa-Api-${props.stageName}`,
      description: 'Versa Property Management API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deploy: false,
    });

    // ─── 5. WAF Web ACL ───
    const webAcl = new wafv2.CfnWebACL(this, 'ApiWaf', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stageName}-ApiWaf`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'RateLimitRule', priority: 1, action: { block: {} },
          statement: { rateBasedStatement: { limit: 1000, aggregateKeyType: 'IP' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'RateLimitRule', sampledRequestsEnabled: true },
        },
        {
          name: 'AWSManagedCommonRuleSet', priority: 2, overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesCommonRuleSet' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'AWSManagedCommonRuleSet', sampledRequestsEnabled: true },
        },
        {
          name: 'AWSManagedKnownBadInputs', priority: 3, overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesKnownBadInputsRuleSet' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'AWSManagedKnownBadInputs', sampledRequestsEnabled: true },
        },
      ],
    });

    // ─── 6. EventBridge ───
    const eventBus = new events.EventBus(this, 'VersaEventBus', {
      eventBusName: `Versa-EventBus-${props.stageName}`,
    });

    // Process Event Lambda (in parent stack)
    const processEventLambda = new nodejs.NodejsFunction(this, 'processEventLambda', {
      functionName: `Versa-processEvent-${props.stageName}`,
      entry: path.join(__dirname, '../../backend/src/handlers/processEvent.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        TABLE_NAME: table.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      bundling: { minify: true, sourceMap: true },
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueue: lambdaDLQ,
    });
    table.grantReadWriteData(processEventLambda);
    eventBus.grantPutEventsTo(processEventLambda);

    new events.Rule(this, 'VersaEventsRule', {
      eventBus: eventBus,
      eventPattern: { source: ['versa.api'] },
      targets: [new targets.LambdaFunction(processEventLambda, { deadLetterQueue: lambdaDLQ })],
    });

    // ─── 7. Authorizer ───
    const authLambda = new nodejs.NodejsFunction(this, 'authorizerLambda', {
      functionName: `Versa-authorizer-${props.stageName}`,
      entry: path.join(__dirname, '../../backend/src/auth/authorizer.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        USER_POOL_ID: props.auth.userPool.userPoolId,
        USER_POOL_CLIENT_ID: props.auth.userPoolClient.userPoolClientId,
        POLICY_STORE_ID: props.auth.policyStoreId,
      },
      bundling: { minify: true, sourceMap: true },
    });

    authLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['verifiedpermissions:IsAuthorized'],
      resources: [`arn:aws:verifiedpermissions:${this.region}:${this.account}:policy-store/${props.auth.policyStoreId}`],
    }));

    const authorizer = new apigateway.TokenAuthorizer(this, 'APIGatewayAuthorizer', {
      handler: authLambda,
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    // ─── 8. Nested Lambda Stacks ───
    const commonNestedProps = { table, eventBus, dlq: lambdaDLQ, stageName: props.stageName };

    const lookupLambdas: LambdaDefinition[] = [
      { id: 'createPropertyType', entry: 'propertyTypes/create.ts' },
      { id: 'getPropertyType', entry: 'propertyTypes/get.ts' },
      { id: 'listPropertyTypes', entry: 'propertyTypes/list.ts' },
      { id: 'updatePropertyType', entry: 'propertyTypes/update.ts' },
      { id: 'deletePropertyType', entry: 'propertyTypes/delete.ts' },
      { id: 'createServiceType', entry: 'serviceTypes/create.ts' },
      { id: 'getServiceType', entry: 'serviceTypes/get.ts' },
      { id: 'listServiceTypes', entry: 'serviceTypes/list.ts' },
      { id: 'updateServiceType', entry: 'serviceTypes/update.ts' },
      { id: 'deleteServiceType', entry: 'serviceTypes/delete.ts' },
      { id: 'listPublicServiceTypes', entry: 'serviceTypes/listPublic.ts' },
      { id: 'createCategory', entry: 'categories/create.ts' },
      { id: 'getCategory', entry: 'categories/get.ts' },
      { id: 'listCategories', entry: 'categories/list.ts' },
      { id: 'updateCategory', entry: 'categories/update.ts' },
      { id: 'deleteCategory', entry: 'categories/delete.ts' },
      { id: 'listPublicCategories', entry: 'categories/listPublic.ts' },
      { id: 'listPublicPropertyTypes', entry: 'propertyTypes/listPublic.ts' },
      { id: 'createServiceTypeCategory', entry: 'serviceTypeCategories/create.ts' },
      { id: 'listServiceTypeCategories', entry: 'serviceTypeCategories/list.ts' },
      { id: 'deleteServiceTypeCategory', entry: 'serviceTypeCategories/delete.ts' },
      { id: 'createCostType', entry: 'costTypes/create.ts' },
      { id: 'getCostType', entry: 'costTypes/get.ts' },
      { id: 'listCostTypes', entry: 'costTypes/list.ts' },
      { id: 'updateCostType', entry: 'costTypes/update.ts' },
      { id: 'deleteCostType', entry: 'costTypes/delete.ts' },
    ];

    const customerLambdas: LambdaDefinition[] = [
      { id: 'createCustomer', entry: 'customers/create.ts' },
      { id: 'getCustomer', entry: 'customers/get.ts' },
      { id: 'listCustomers', entry: 'customers/list.ts' },
      { id: 'updateCustomer', entry: 'customers/update.ts' },
      { id: 'deleteCustomer', entry: 'customers/delete.ts' },
      { id: 'getCustomerAccount', entry: 'customers/getAccount.ts' },
      { id: 'createDelegate', entry: 'delegates/create.ts' },
      { id: 'listDelegates', entry: 'delegates/list.ts' },
      { id: 'deleteDelegate', entry: 'delegates/delete.ts' },
    ];

    const propertyLambdas: LambdaDefinition[] = [
      { id: 'createProperty', entry: 'properties/create.ts' },
      { id: 'getProperty', entry: 'properties/get.ts' },
      { id: 'listPropertiesByCustomer', entry: 'properties/listByCustomer.ts' },
      { id: 'updateProperty', entry: 'properties/update.ts' },
      { id: 'deleteProperty', entry: 'properties/delete.ts' },
      { id: 'createPropertyService', entry: 'propertyServices/create.ts' },
      { id: 'getPropertyService', entry: 'propertyServices/get.ts' },
      { id: 'listPropertyServices', entry: 'propertyServices/listByProperty.ts' },
      { id: 'updatePropertyService', entry: 'propertyServices/update.ts' },
      { id: 'deletePropertyService', entry: 'propertyServices/delete.ts' },
      { id: 'createCost', entry: 'costs/create.ts' },
      { id: 'listCosts', entry: 'costs/listByService.ts' },
      { id: 'deleteCost', entry: 'costs/delete.ts' },
    ];

    const planLambdas: LambdaDefinition[] = [
      { id: 'createPlan', entry: 'plans/create.ts' },
      { id: 'getPlan', entry: 'plans/get.ts' },
      { id: 'listPlans', entry: 'plans/list.ts' },
      { id: 'updatePlan', entry: 'plans/update.ts' },
      { id: 'deletePlan', entry: 'plans/delete.ts' },
      { id: 'listPublicPlans', entry: 'plans/listPublic.ts' },
      { id: 'createPlanService', entry: 'planServices/create.ts' },
      { id: 'listPlanServices', entry: 'planServices/list.ts' },
      { id: 'deletePlanService', entry: 'planServices/delete.ts' },
      { id: 'createPlanCategory', entry: 'planCategories/create.ts' },
      { id: 'listPlanCategories', entry: 'planCategories/list.ts' },
      { id: 'deletePlanCategory', entry: 'planCategories/delete.ts' },
    ];

    const workforceLambdas: LambdaDefinition[] = [
      { id: 'createEmployee', entry: 'employees/create.ts' },
      { id: 'getEmployee', entry: 'employees/get.ts' },
      { id: 'listEmployees', entry: 'employees/list.ts' },
      { id: 'updateEmployee', entry: 'employees/update.ts' },
      { id: 'deleteEmployee', entry: 'employees/delete.ts' },
      { id: 'createServicer', entry: 'servicers/create.ts' },
      { id: 'getServicer', entry: 'servicers/get.ts' },
      { id: 'updateServicer', entry: 'servicers/update.ts' },
      { id: 'createCapability', entry: 'capabilities/create.ts' },
      { id: 'listCapabilities', entry: 'capabilities/list.ts' },
      { id: 'deleteCapability', entry: 'capabilities/delete.ts' },
      { id: 'createServiceSchedule', entry: 'serviceSchedules/create.ts' },
      { id: 'getServiceSchedule', entry: 'serviceSchedules/get.ts' },
      { id: 'listServiceSchedules', entry: 'serviceSchedules/list.ts' },
      { id: 'updateServiceSchedule', entry: 'serviceSchedules/update.ts' },
    ];

    const billingLambdas: LambdaDefinition[] = [
      { id: 'createInvoice', entry: 'invoices/create.ts' },
      { id: 'getInvoice', entry: 'invoices/get.ts' },
      { id: 'listInvoices', entry: 'invoices/list.ts' },
      { id: 'updateInvoice', entry: 'invoices/update.ts' },
      { id: 'createPaymentMethod', entry: 'paymentMethods/create.ts' },
      { id: 'listPaymentMethods', entry: 'paymentMethods/list.ts' },
      { id: 'deletePaymentMethod', entry: 'paymentMethods/delete.ts' },
      { id: 'createInvoiceSchedule', entry: 'invoiceSchedules/create.ts' },
      { id: 'listInvoiceSchedules', entry: 'invoiceSchedules/list.ts' },
      { id: 'updateInvoiceSchedule', entry: 'invoiceSchedules/update.ts' },
      { id: 'deleteInvoiceSchedule', entry: 'invoiceSchedules/delete.ts' },
      { id: 'createPay', entry: 'pay/create.ts' },
      { id: 'listPay', entry: 'pay/list.ts' },
      { id: 'updatePay', entry: 'pay/update.ts' },
      { id: 'deletePay', entry: 'pay/delete.ts' },
      { id: 'createPaySchedule', entry: 'paySchedules/create.ts' },
      { id: 'getPaySchedule', entry: 'paySchedules/get.ts' },
      { id: 'listPaySchedules', entry: 'paySchedules/list.ts' },
      { id: 'updatePaySchedule', entry: 'paySchedules/update.ts' },
      { id: 'deletePaySchedule', entry: 'paySchedules/delete.ts' },
    ];

    const estimateLambdas: LambdaDefinition[] = [
      { id: 'createEstimate', entry: 'estimates/create.ts' },
      { id: 'getEstimate', entry: 'estimates/get.ts' },
      { id: 'listEstimates', entry: 'estimates/list.ts' },
      { id: 'updateEstimate', entry: 'estimates/update.ts' },
      { id: 'deleteEstimate', entry: 'estimates/delete.ts' },
      { id: 'convertEstimateToInvoice', entry: 'estimates/convertToInvoice.ts' },
    ];

    const organizationLambdas: LambdaDefinition[] = [
      { id: 'createOrganization', entry: 'organizations/create.ts' },
      { id: 'getOrganization', entry: 'organizations/get.ts' },
      { id: 'listOrganizations', entry: 'organizations/list.ts' },
      { id: 'updateOrganization', entry: 'organizations/update.ts' },
      { id: 'deleteOrganization', entry: 'organizations/delete.ts' },
      { id: 'getOrgConfig', entry: 'organizations/getConfig.ts' },
      { id: 'updateOrgConfig', entry: 'organizations/updateConfig.ts' },
      { id: 'getOrgSecrets', entry: 'organizations/getSecrets.ts' },
      { id: 'setOrgSecret', entry: 'organizations/setSecret.ts' },
      { id: 'listAdminUsers', entry: 'organizations/listAdminUsers.ts' },
    ];

    const secretsManagerPolicy = new iam.PolicyStatement({
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:PutSecretValue',
        'secretsmanager:CreateSecret',
        'secretsmanager:DeleteSecret',
      ],
      resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:versa/org/*`],
    });

    const lookup = new LambdaStack(this, 'LookupLambdas', { ...commonNestedProps, lambdas: lookupLambdas });
    const customer = new LambdaStack(this, 'CustomerLambdas', { ...commonNestedProps, lambdas: customerLambdas });
    const property = new LambdaStack(this, 'PropertyLambdas', { ...commonNestedProps, lambdas: propertyLambdas });
    const plan = new LambdaStack(this, 'PlanLambdas', { ...commonNestedProps, lambdas: planLambdas });
    const workforce = new LambdaStack(this, 'WorkforceLambdas', { ...commonNestedProps, lambdas: workforceLambdas });
    const billing = new LambdaStack(this, 'BillingLambdas', { ...commonNestedProps, lambdas: billingLambdas });
    const estimate = new LambdaStack(this, 'EstimateLambdas', { ...commonNestedProps, lambdas: estimateLambdas });
    const cognitoListUsersPolicy = new iam.PolicyStatement({
      actions: ['cognito-idp:ListUsersInGroup'],
      resources: [props.auth.userPool.userPoolArn],
    });

    const organization = new LambdaStack(this, 'OrganizationLambdas', {
      ...commonNestedProps,
      lambdas: organizationLambdas,
      additionalPolicies: [secretsManagerPolicy, cognitoListUsersPolicy],
      additionalEnvironment: { USER_POOL_ID: props.auth.userPool.userPoolId },
    });

    // ─── 9. API Gateway Route Stacks ───
    const lookupRoutes = new LookupRouteStack(this, 'LookupRoutes', {
      apiRoot: api.root, authorizer, lookup, plan,
    });

    const coreRoutes = new CoreRouteStack(this, 'CoreRoutes', {
      apiRoot: api.root, authorizer, customer, property, billing, plan,
    });

    const opsRoutes = new OperationsRouteStack(this, 'OperationsRoutes', {
      apiRoot: api.root, authorizer, workforce, billing, estimate, organization,
    });

    // ─── 10. Manual Deployment & Stage ───
    const deployment = new apigateway.Deployment(this, 'Deployment', { api });
    const stage = new apigateway.Stage(this, 'DeployStage', {
      deployment,
      stageName: props.stageName,
    });
    new wafv2.CfnWebACLAssociation(this, 'ApiWafAssociation', {
      resourceArn: stage.stageArn,
      webAclArn: webAcl.attrArn,
    });

    // Deployment must wait for all route stacks
    [lookupRoutes, coreRoutes, opsRoutes].forEach(rs => {
      if (rs.nestedStackResource) {
        deployment.node.addDependency(rs);
      }
    });

    // ─── 11. API Gateway Usage Plan ───
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: `Versa-UsagePlan-${props.stageName}`,
      description: 'Rate limiting usage plan',
      throttle: { rateLimit: 100, burstLimit: 200 },
      quota: { limit: 10000, period: apigateway.Period.DAY },
    });
    usagePlan.addApiStage({ stage });

    new cdk.CfnOutput(this, 'ApiUrl', { value: stage.urlForPath('/') });

    // ─── 11. CloudWatch Alarms ───
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: api.metricServerError({ period: cdk.Duration.minutes(5) }),
      threshold: 5, evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'API Gateway 5xx error rate is elevated',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: api.metricLatency({ statistic: 'p99', period: cdk.Duration.minutes(5) }),
      threshold: 3000, evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'API Gateway p99 latency > 3 seconds',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      metric: table.metric('ReadThrottleEvents', { period: cdk.Duration.minutes(5) }),
      threshold: 1, evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: 'DynamoDB read throttle events detected',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dynamoThrottleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    // ─── 12. CloudWatch Dashboard ───
    const dashboard = new cloudwatch.Dashboard(this, 'ServiceDashboard', {
      dashboardName: `Versa-Dashboard-${props.stageName}`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Request Count',
        left: [api.metricCount({ period: cdk.Duration.minutes(5) })],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - 4xx / 5xx Errors',
        left: [api.metricClientError({ period: cdk.Duration.minutes(5) }), api.metricServerError({ period: cdk.Duration.minutes(5) })],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency (p50, p90, p99)',
        left: [
          api.metricLatency({ statistic: 'p50', period: cdk.Duration.minutes(5) }),
          api.metricLatency({ statistic: 'p90', period: cdk.Duration.minutes(5) }),
          api.metricLatency({ statistic: 'p99', period: cdk.Duration.minutes(5) }),
        ],
        width: 8,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Consumed Read/Write Capacity',
        left: [table.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5) }), table.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5) })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Throttled Requests',
        left: [table.metric('ReadThrottleEvents', { period: cdk.Duration.minutes(5) }), table.metric('WriteThrottleEvents', { period: cdk.Duration.minutes(5) })],
        width: 12,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Dead Letter Queue - Messages',
        left: [lambdaDLQ.metricApproximateNumberOfMessagesVisible({ period: cdk.Duration.minutes(5) }), lambdaDLQ.metricNumberOfMessagesSent({ period: cdk.Duration.minutes(5) })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'WAF - Blocked Requests',
        left: [new cloudwatch.Metric({
          namespace: 'AWS/WAFV2', metricName: 'BlockedRequests',
          dimensionsMap: { WebACL: webAcl.attrArn.split('/').pop()!, Rule: 'ALL', Region: this.region },
          period: cdk.Duration.minutes(5),
        })],
        width: 12,
      }),
    );

    // ─── 13. cdk-nag suppressions ───
    NagSuppressions.addStackSuppressions(this, [
      { id: 'AwsSolutions-APIG1', reason: 'Access logging not required for dev stage' },
      { id: 'AwsSolutions-APIG2', reason: 'Request validation handled by Middy middleware at handler level' },
      { id: 'AwsSolutions-APIG4', reason: 'Authorization is handled by Lambda Token Authorizer' },
      { id: 'AwsSolutions-APIG6', reason: 'Execution logging not required for dev stage' },
      { id: 'AwsSolutions-COG4', reason: 'Using Lambda Token Authorizer instead of Cognito Authorizer' },
      { id: 'AwsSolutions-DDB3', reason: 'Point-in-time recovery not required for dev stage' },
      { id: 'AwsSolutions-IAM4', reason: 'Managed policies acceptable for Lambda execution roles' },
      { id: 'AwsSolutions-IAM5', reason: 'Wildcard permissions acceptable for DynamoDB index access' },
      { id: 'AwsSolutions-L1', reason: 'Using Node.js 22.x which is current' },
      { id: 'AwsSolutions-SQS3', reason: 'Lambda DLQ is the terminal queue — no further DLQ needed' },
      { id: 'AwsSolutions-SNS2', reason: 'SNS topic encryption not required for alarm notifications' },
      { id: 'AwsSolutions-SNS3', reason: 'SNS topic does not need to enforce SSL for alarm notifications' },
      { id: 'AwsSolutions-APIG3', reason: 'WAF is associated via CfnWebACLAssociation at regional scope' },
      { id: 'AwsSolutions-SQS4', reason: 'DLQ SSL enforcement not required for dev stage' },
    ], true);
  }
}
