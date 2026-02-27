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
import { LookupLambdas } from './lambda-stacks/lookup-lambdas';
import { CustomerLambdas } from './lambda-stacks/customer-lambdas';
import { PropertyLambdas } from './lambda-stacks/property-lambdas';
import { PlanLambdas } from './lambda-stacks/plan-lambdas';
import { WorkforceLambdas } from './lambda-stacks/workforce-lambdas';
import { BillingLambdas } from './lambda-stacks/billing-lambdas';

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
      restApiName: `Versa Service ${props.stageName}`,
      description: 'Versa Property Management API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: { stageName: props.stageName },
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

    new wafv2.CfnWebACLAssociation(this, 'ApiWafAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: webAcl.attrArn,
    });

    // ─── 6. EventBridge ───
    const eventBus = new events.EventBus(this, 'VersaEventBus', {
      eventBusName: `Versa-EventBus-${props.stageName}`,
    });

    // Process Event Lambda (in parent stack)
    const processEventLambda = new nodejs.NodejsFunction(this, 'processEventLambda', {
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
    const nestedProps = { table, eventBus, dlq: lambdaDLQ };

    const lookup = new LookupLambdas(this, 'LookupLambdas', nestedProps);
    const customer = new CustomerLambdas(this, 'CustomerLambdas', nestedProps);
    const property = new PropertyLambdas(this, 'PropertyLambdas', nestedProps);
    const plan = new PlanLambdas(this, 'PlanLambdas', nestedProps);
    const workforce = new WorkforceLambdas(this, 'WorkforceLambdas', nestedProps);
    const billing = new BillingLambdas(this, 'BillingLambdas', nestedProps);

    // ─── 9. API Gateway Routes ───
    const opts = { authorizer };
    const li = (fn: nodejs.NodejsFunction) => new apigateway.LambdaIntegration(fn);

    // Property Types
    const propertyTypes = api.root.addResource('property-types');
    propertyTypes.addMethod('GET', li(lookup.listPropertyTypes), opts);
    propertyTypes.addMethod('POST', li(lookup.createPropertyType), opts);
    const propertyTypeRes = propertyTypes.addResource('{propertyTypeId}');
    propertyTypeRes.addMethod('GET', li(lookup.getPropertyType), opts);
    propertyTypeRes.addMethod('PUT', li(lookup.updatePropertyType), opts);
    propertyTypeRes.addMethod('DELETE', li(lookup.deletePropertyType), opts);

    // Service Types
    const serviceTypes = api.root.addResource('service-types');
    serviceTypes.addMethod('GET', li(lookup.listServiceTypes), opts);
    serviceTypes.addMethod('POST', li(lookup.createServiceType), opts);
    const serviceTypeRes = serviceTypes.addResource('{serviceTypeId}');
    serviceTypeRes.addMethod('GET', li(lookup.getServiceType), opts);
    serviceTypeRes.addMethod('PUT', li(lookup.updateServiceType), opts);
    serviceTypeRes.addMethod('DELETE', li(lookup.deleteServiceType), opts);

    // Cost Types
    const costTypes = api.root.addResource('cost-types');
    costTypes.addMethod('GET', li(lookup.listCostTypes), opts);
    costTypes.addMethod('POST', li(lookup.createCostType), opts);
    const costTypeRes = costTypes.addResource('{costTypeId}');
    costTypeRes.addMethod('GET', li(lookup.getCostType), opts);
    costTypeRes.addMethod('PUT', li(lookup.updateCostType), opts);
    costTypeRes.addMethod('DELETE', li(lookup.deleteCostType), opts);

    // Customers
    const customers = api.root.addResource('customers');
    customers.addMethod('GET', li(customer.listCustomers), opts);
    customers.addMethod('POST', li(customer.createCustomer), opts);
    const customerRes = customers.addResource('{customerId}');
    customerRes.addMethod('GET', li(customer.getCustomer), opts);
    customerRes.addMethod('PUT', li(customer.updateCustomer), opts);
    customerRes.addMethod('DELETE', li(customer.deleteCustomer), opts);
    const customerAccount = customerRes.addResource('account');
    customerAccount.addMethod('GET', li(customer.getCustomerAccount), opts);

    // Customer Properties
    const customerProperties = customerRes.addResource('properties');
    customerProperties.addMethod('GET', li(property.listPropertiesByCustomer), opts);
    customerProperties.addMethod('POST', li(property.createProperty), opts);

    // Customer Payment Methods
    const customerPaymentMethods = customerRes.addResource('payment-methods');
    customerPaymentMethods.addMethod('GET', li(billing.listPaymentMethods), opts);
    customerPaymentMethods.addMethod('POST', li(billing.createPaymentMethod), opts);

    // Customer Invoice Schedules
    const customerInvoiceSchedules = customerRes.addResource('invoice-schedules');
    customerInvoiceSchedules.addMethod('GET', li(billing.listInvoiceSchedules), opts);
    customerInvoiceSchedules.addMethod('POST', li(billing.createInvoiceSchedule), opts);

    // Accounts / Delegates
    const accounts = api.root.addResource('accounts');
    const accountRes = accounts.addResource('{accountId}');
    const accountDelegates = accountRes.addResource('delegates');
    accountDelegates.addMethod('GET', li(customer.listDelegates), opts);
    accountDelegates.addMethod('POST', li(customer.createDelegate), opts);

    // Delegates (top-level delete)
    const delegates = api.root.addResource('delegates');
    const delegateRes = delegates.addResource('{delegateId}');
    delegateRes.addMethod('DELETE', li(customer.deleteDelegate), opts);

    // Properties (top-level)
    const properties = api.root.addResource('properties');
    const propertyRes = properties.addResource('{propertyId}');
    propertyRes.addMethod('GET', li(property.getProperty), opts);
    propertyRes.addMethod('PUT', li(property.updateProperty), opts);
    propertyRes.addMethod('DELETE', li(property.deleteProperty), opts);

    // Plans
    const plans = api.root.addResource('plans');
    plans.addMethod('GET', li(plan.listPlans), opts);
    plans.addMethod('POST', li(plan.createPlan), opts);
    const planRes = plans.addResource('{planId}');
    planRes.addMethod('GET', li(plan.getPlan), opts);
    planRes.addMethod('PUT', li(plan.updatePlan), opts);
    planRes.addMethod('DELETE', li(plan.deletePlan), opts);

    // Plan Services
    const planServices = planRes.addResource('services');
    planServices.addMethod('GET', li(plan.listPlanServices), opts);
    planServices.addMethod('POST', li(plan.createPlanService), opts);
    const planServiceRes = planServices.addResource('{serviceTypeId}');
    planServiceRes.addMethod('DELETE', li(plan.deletePlanService), opts);

    // Property Services (top-level)
    const propertyServicesRoot = api.root.addResource('property-services');
    const propertyServiceItem = propertyServicesRoot.addResource('{serviceId}');
    propertyServiceItem.addMethod('GET', li(property.getPropertyService), opts);
    propertyServiceItem.addMethod('PUT', li(property.updatePropertyService), opts);
    propertyServiceItem.addMethod('DELETE', li(property.deletePropertyService), opts);

    // Property Services by Property
    const propertyPropertyServices = propertyRes.addResource('services');
    propertyPropertyServices.addMethod('GET', li(property.listPropertyServices), opts);
    propertyPropertyServices.addMethod('POST', li(property.createPropertyService), opts);

    // Costs
    const serviceCosts = propertyServiceItem.addResource('costs');
    serviceCosts.addMethod('GET', li(property.listCosts), opts);
    serviceCosts.addMethod('POST', li(property.createCost), opts);

    const costs = api.root.addResource('costs');
    const costRes = costs.addResource('{costId}');
    costRes.addMethod('DELETE', li(property.deleteCost), opts);

    // Employees
    const employees = api.root.addResource('employees');
    employees.addMethod('GET', li(workforce.listEmployees), opts);
    employees.addMethod('POST', li(workforce.createEmployee), opts);
    const employeeRes = employees.addResource('{employeeId}');
    employeeRes.addMethod('GET', li(workforce.getEmployee), opts);
    employeeRes.addMethod('PUT', li(workforce.updateEmployee), opts);
    employeeRes.addMethod('DELETE', li(workforce.deleteEmployee), opts);

    // Employee Servicer
    const employeeServicer = employeeRes.addResource('servicer');
    employeeServicer.addMethod('POST', li(workforce.createServicer), opts);

    // Employee Capabilities
    const employeeCapabilities = employeeRes.addResource('capabilities');
    employeeCapabilities.addMethod('GET', li(workforce.listCapabilities), opts);
    employeeCapabilities.addMethod('POST', li(workforce.createCapability), opts);

    // Employee Pay
    const employeePay = employeeRes.addResource('pay');
    employeePay.addMethod('GET', li(billing.listPay), opts);
    employeePay.addMethod('POST', li(billing.createPay), opts);

    // Servicers (top-level)
    const servicers = api.root.addResource('servicers');
    const servicerRes = servicers.addResource('{servicerId}');
    servicerRes.addMethod('GET', li(workforce.getServicer), opts);
    servicerRes.addMethod('PUT', li(workforce.updateServicer), opts);

    // Capabilities (top-level delete)
    const capabilities = api.root.addResource('capabilities');
    const capabilityRes = capabilities.addResource('{capabilityId}');
    capabilityRes.addMethod('DELETE', li(workforce.deleteCapability), opts);

    // Service Schedules
    const serviceSchedules = api.root.addResource('service-schedules');
    serviceSchedules.addMethod('GET', li(workforce.listServiceSchedules), opts);
    serviceSchedules.addMethod('POST', li(workforce.createServiceSchedule), opts);
    const serviceScheduleRes = serviceSchedules.addResource('{serviceScheduleId}');
    serviceScheduleRes.addMethod('GET', li(workforce.getServiceSchedule), opts);
    serviceScheduleRes.addMethod('PUT', li(workforce.updateServiceSchedule), opts);

    // Invoices
    const invoices = api.root.addResource('invoices');
    invoices.addMethod('GET', li(billing.listInvoices), opts);
    invoices.addMethod('POST', li(billing.createInvoice), opts);
    const invoiceRes = invoices.addResource('{invoiceId}');
    invoiceRes.addMethod('GET', li(billing.getInvoice), opts);
    invoiceRes.addMethod('PUT', li(billing.updateInvoice), opts);

    // Payment Methods (top-level delete)
    const paymentMethods = api.root.addResource('payment-methods');
    const paymentMethodRes = paymentMethods.addResource('{paymentMethodId}');
    paymentMethodRes.addMethod('DELETE', li(billing.deletePaymentMethod), opts);

    // Invoice Schedules (top-level)
    const invoiceSchedules = api.root.addResource('invoice-schedules');
    const invoiceScheduleRes = invoiceSchedules.addResource('{invoiceScheduleId}');
    invoiceScheduleRes.addMethod('PUT', li(billing.updateInvoiceSchedule), opts);
    invoiceScheduleRes.addMethod('DELETE', li(billing.deleteInvoiceSchedule), opts);

    // Pay (top-level)
    const payRoot = api.root.addResource('pay');
    const payItem = payRoot.addResource('{payId}');
    payItem.addMethod('PUT', li(billing.updatePay), opts);
    payItem.addMethod('DELETE', li(billing.deletePay), opts);

    // Pay Schedules
    const paySchedules = api.root.addResource('pay-schedules');
    paySchedules.addMethod('GET', li(billing.listPaySchedules), opts);
    paySchedules.addMethod('POST', li(billing.createPaySchedule), opts);
    const payScheduleRes = paySchedules.addResource('{payScheduleId}');
    payScheduleRes.addMethod('GET', li(billing.getPaySchedule), opts);
    payScheduleRes.addMethod('PUT', li(billing.updatePaySchedule), opts);
    payScheduleRes.addMethod('DELETE', li(billing.deletePaySchedule), opts);

    // ─── 10. API Gateway Usage Plan ───
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: `${props.stageName}-UsagePlan`,
      description: 'Rate limiting usage plan',
      throttle: { rateLimit: 100, burstLimit: 200 },
      quota: { limit: 10000, period: apigateway.Period.DAY },
    });
    usagePlan.addApiStage({ stage: api.deploymentStage });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });

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
      dashboardName: `${props.stageName}-ServiceDashboard`,
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
