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
      { id: 'createPlanService', entry: 'planServices/create.ts' },
      { id: 'listPlanServices', entry: 'planServices/list.ts' },
      { id: 'deletePlanService', entry: 'planServices/delete.ts' },
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

    const lookup = new LambdaStack(this, 'LookupLambdas', { ...commonNestedProps, lambdas: lookupLambdas });
    const customer = new LambdaStack(this, 'CustomerLambdas', { ...commonNestedProps, lambdas: customerLambdas });
    const property = new LambdaStack(this, 'PropertyLambdas', { ...commonNestedProps, lambdas: propertyLambdas });
    const plan = new LambdaStack(this, 'PlanLambdas', { ...commonNestedProps, lambdas: planLambdas });
    const workforce = new LambdaStack(this, 'WorkforceLambdas', { ...commonNestedProps, lambdas: workforceLambdas });
    const billing = new LambdaStack(this, 'BillingLambdas', { ...commonNestedProps, lambdas: billingLambdas });

    // ─── 9. API Gateway Routes ───
    const opts = { authorizer };
    const li = (fn: nodejs.NodejsFunction) => new apigateway.LambdaIntegration(fn);

    // Property Types
    const propertyTypes = api.root.addResource('property-types');
    propertyTypes.addMethod('GET', li(lookup.functions.listPropertyTypes), opts);
    propertyTypes.addMethod('POST', li(lookup.functions.createPropertyType), opts);
    const propertyTypeRes = propertyTypes.addResource('{propertyTypeId}');
    propertyTypeRes.addMethod('GET', li(lookup.functions.getPropertyType), opts);
    propertyTypeRes.addMethod('PUT', li(lookup.functions.updatePropertyType), opts);
    propertyTypeRes.addMethod('DELETE', li(lookup.functions.deletePropertyType), opts);

    // Service Types
    const serviceTypes = api.root.addResource('service-types');
    serviceTypes.addMethod('GET', li(lookup.functions.listServiceTypes), opts);
    serviceTypes.addMethod('POST', li(lookup.functions.createServiceType), opts);
    const serviceTypeRes = serviceTypes.addResource('{serviceTypeId}');
    serviceTypeRes.addMethod('GET', li(lookup.functions.getServiceType), opts);
    serviceTypeRes.addMethod('PUT', li(lookup.functions.updateServiceType), opts);
    serviceTypeRes.addMethod('DELETE', li(lookup.functions.deleteServiceType), opts);

    // Cost Types
    const costTypes = api.root.addResource('cost-types');
    costTypes.addMethod('GET', li(lookup.functions.listCostTypes), opts);
    costTypes.addMethod('POST', li(lookup.functions.createCostType), opts);
    const costTypeRes = costTypes.addResource('{costTypeId}');
    costTypeRes.addMethod('GET', li(lookup.functions.getCostType), opts);
    costTypeRes.addMethod('PUT', li(lookup.functions.updateCostType), opts);
    costTypeRes.addMethod('DELETE', li(lookup.functions.deleteCostType), opts);

    // Customers
    const customers = api.root.addResource('customers');
    customers.addMethod('GET', li(customer.functions.listCustomers), opts);
    customers.addMethod('POST', li(customer.functions.createCustomer), opts);
    const customerRes = customers.addResource('{customerId}');
    customerRes.addMethod('GET', li(customer.functions.getCustomer), opts);
    customerRes.addMethod('PUT', li(customer.functions.updateCustomer), opts);
    customerRes.addMethod('DELETE', li(customer.functions.deleteCustomer), opts);
    const customerAccount = customerRes.addResource('account');
    customerAccount.addMethod('GET', li(customer.functions.getCustomerAccount), opts);

    // Customer Properties
    const customerProperties = customerRes.addResource('properties');
    customerProperties.addMethod('GET', li(property.functions.listPropertiesByCustomer), opts);
    customerProperties.addMethod('POST', li(property.functions.createProperty), opts);

    // Customer Payment Methods
    const customerPaymentMethods = customerRes.addResource('payment-methods');
    customerPaymentMethods.addMethod('GET', li(billing.functions.listPaymentMethods), opts);
    customerPaymentMethods.addMethod('POST', li(billing.functions.createPaymentMethod), opts);

    // Customer Invoice Schedules
    const customerInvoiceSchedules = customerRes.addResource('invoice-schedules');
    customerInvoiceSchedules.addMethod('GET', li(billing.functions.listInvoiceSchedules), opts);
    customerInvoiceSchedules.addMethod('POST', li(billing.functions.createInvoiceSchedule), opts);

    // Accounts / Delegates
    const accounts = api.root.addResource('accounts');
    const accountRes = accounts.addResource('{accountId}');
    const accountDelegates = accountRes.addResource('delegates');
    accountDelegates.addMethod('GET', li(customer.functions.listDelegates), opts);
    accountDelegates.addMethod('POST', li(customer.functions.createDelegate), opts);

    // Delegates (top-level delete)
    const delegates = api.root.addResource('delegates');
    const delegateRes = delegates.addResource('{delegateId}');
    delegateRes.addMethod('DELETE', li(customer.functions.deleteDelegate), opts);

    // Properties (top-level)
    const properties = api.root.addResource('properties');
    const propertyRes = properties.addResource('{propertyId}');
    propertyRes.addMethod('GET', li(property.functions.getProperty), opts);
    propertyRes.addMethod('PUT', li(property.functions.updateProperty), opts);
    propertyRes.addMethod('DELETE', li(property.functions.deleteProperty), opts);

    // Plans
    const plans = api.root.addResource('plans');
    plans.addMethod('GET', li(plan.functions.listPlans), opts);
    plans.addMethod('POST', li(plan.functions.createPlan), opts);
    const planRes = plans.addResource('{planId}');
    planRes.addMethod('GET', li(plan.functions.getPlan), opts);
    planRes.addMethod('PUT', li(plan.functions.updatePlan), opts);
    planRes.addMethod('DELETE', li(plan.functions.deletePlan), opts);

    // Plan Services
    const planServices = planRes.addResource('services');
    planServices.addMethod('GET', li(plan.functions.listPlanServices), opts);
    planServices.addMethod('POST', li(plan.functions.createPlanService), opts);
    const planServiceRes = planServices.addResource('{serviceTypeId}');
    planServiceRes.addMethod('DELETE', li(plan.functions.deletePlanService), opts);

    // Property Services (top-level)
    const propertyServicesRoot = api.root.addResource('property-services');
    const propertyServiceItem = propertyServicesRoot.addResource('{serviceId}');
    propertyServiceItem.addMethod('GET', li(property.functions.getPropertyService), opts);
    propertyServiceItem.addMethod('PUT', li(property.functions.updatePropertyService), opts);
    propertyServiceItem.addMethod('DELETE', li(property.functions.deletePropertyService), opts);

    // Property Services by Property
    const propertyPropertyServices = propertyRes.addResource('services');
    propertyPropertyServices.addMethod('GET', li(property.functions.listPropertyServices), opts);
    propertyPropertyServices.addMethod('POST', li(property.functions.createPropertyService), opts);

    // Costs
    const serviceCosts = propertyServiceItem.addResource('costs');
    serviceCosts.addMethod('GET', li(property.functions.listCosts), opts);
    serviceCosts.addMethod('POST', li(property.functions.createCost), opts);

    const costs = api.root.addResource('costs');
    const costRes = costs.addResource('{costId}');
    costRes.addMethod('DELETE', li(property.functions.deleteCost), opts);

    // Employees
    const employees = api.root.addResource('employees');
    employees.addMethod('GET', li(workforce.functions.listEmployees), opts);
    employees.addMethod('POST', li(workforce.functions.createEmployee), opts);
    const employeeRes = employees.addResource('{employeeId}');
    employeeRes.addMethod('GET', li(workforce.functions.getEmployee), opts);
    employeeRes.addMethod('PUT', li(workforce.functions.updateEmployee), opts);
    employeeRes.addMethod('DELETE', li(workforce.functions.deleteEmployee), opts);

    // Employee Servicer
    const employeeServicer = employeeRes.addResource('servicer');
    employeeServicer.addMethod('POST', li(workforce.functions.createServicer), opts);

    // Employee Capabilities
    const employeeCapabilities = employeeRes.addResource('capabilities');
    employeeCapabilities.addMethod('GET', li(workforce.functions.listCapabilities), opts);
    employeeCapabilities.addMethod('POST', li(workforce.functions.createCapability), opts);

    // Employee Pay
    const employeePay = employeeRes.addResource('pay');
    employeePay.addMethod('GET', li(billing.functions.listPay), opts);
    employeePay.addMethod('POST', li(billing.functions.createPay), opts);

    // Servicers (top-level)
    const servicers = api.root.addResource('servicers');
    const servicerRes = servicers.addResource('{servicerId}');
    servicerRes.addMethod('GET', li(workforce.functions.getServicer), opts);
    servicerRes.addMethod('PUT', li(workforce.functions.updateServicer), opts);

    // Capabilities (top-level delete)
    const capabilities = api.root.addResource('capabilities');
    const capabilityRes = capabilities.addResource('{capabilityId}');
    capabilityRes.addMethod('DELETE', li(workforce.functions.deleteCapability), opts);

    // Service Schedules
    const serviceSchedules = api.root.addResource('service-schedules');
    serviceSchedules.addMethod('GET', li(workforce.functions.listServiceSchedules), opts);
    serviceSchedules.addMethod('POST', li(workforce.functions.createServiceSchedule), opts);
    const serviceScheduleRes = serviceSchedules.addResource('{serviceScheduleId}');
    serviceScheduleRes.addMethod('GET', li(workforce.functions.getServiceSchedule), opts);
    serviceScheduleRes.addMethod('PUT', li(workforce.functions.updateServiceSchedule), opts);

    // Invoices
    const invoices = api.root.addResource('invoices');
    invoices.addMethod('GET', li(billing.functions.listInvoices), opts);
    invoices.addMethod('POST', li(billing.functions.createInvoice), opts);
    const invoiceRes = invoices.addResource('{invoiceId}');
    invoiceRes.addMethod('GET', li(billing.functions.getInvoice), opts);
    invoiceRes.addMethod('PUT', li(billing.functions.updateInvoice), opts);

    // Payment Methods (top-level delete)
    const paymentMethods = api.root.addResource('payment-methods');
    const paymentMethodRes = paymentMethods.addResource('{paymentMethodId}');
    paymentMethodRes.addMethod('DELETE', li(billing.functions.deletePaymentMethod), opts);

    // Invoice Schedules (top-level)
    const invoiceSchedules = api.root.addResource('invoice-schedules');
    const invoiceScheduleRes = invoiceSchedules.addResource('{invoiceScheduleId}');
    invoiceScheduleRes.addMethod('PUT', li(billing.functions.updateInvoiceSchedule), opts);
    invoiceScheduleRes.addMethod('DELETE', li(billing.functions.deleteInvoiceSchedule), opts);

    // Pay (top-level)
    const payRoot = api.root.addResource('pay');
    const payItem = payRoot.addResource('{payId}');
    payItem.addMethod('PUT', li(billing.functions.updatePay), opts);
    payItem.addMethod('DELETE', li(billing.functions.deletePay), opts);

    // Pay Schedules
    const paySchedules = api.root.addResource('pay-schedules');
    paySchedules.addMethod('GET', li(billing.functions.listPaySchedules), opts);
    paySchedules.addMethod('POST', li(billing.functions.createPaySchedule), opts);
    const payScheduleRes = paySchedules.addResource('{payScheduleId}');
    payScheduleRes.addMethod('GET', li(billing.functions.getPaySchedule), opts);
    payScheduleRes.addMethod('PUT', li(billing.functions.updatePaySchedule), opts);
    payScheduleRes.addMethod('DELETE', li(billing.functions.deletePaySchedule), opts);

    // ─── 10. API Gateway Usage Plan ───
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: `Versa-UsagePlan-${props.stageName}`,
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
