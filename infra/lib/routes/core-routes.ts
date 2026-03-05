import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaStack } from '../lambda-stack';

interface CoreRouteStackProps {
  apiRoot: apigateway.IResource;
  authorizer: apigateway.IAuthorizer;
  customer: LambdaStack;
  property: LambdaStack;
  billing: LambdaStack;
  plan: LambdaStack;
}

export class CoreRouteStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: CoreRouteStackProps) {
    super(scope, id);

    const { apiRoot, authorizer, customer, property, billing, plan } = props;
    const opts: apigateway.MethodOptions = { authorizer };
    const li = (fn: lambda.IFunction) => new apigateway.LambdaIntegration(fn, { allowTestInvoke: false });

    // Customers
    const customers = new apigateway.Resource(this, 'customers', {
      parent: apiRoot, pathPart: 'customers',
    });
    customers.addMethod('GET', li(customer.functions.listCustomers), opts);
    customers.addMethod('POST', li(customer.functions.createCustomer), opts);
    const customerRes = new apigateway.Resource(this, 'customer-item', {
      parent: customers, pathPart: '{customerId}',
    });
    customerRes.addMethod('GET', li(customer.functions.getCustomer), opts);
    customerRes.addMethod('PUT', li(customer.functions.updateCustomer), opts);
    customerRes.addMethod('DELETE', li(customer.functions.deleteCustomer), opts);
    const customerAccount = new apigateway.Resource(this, 'customer-account', {
      parent: customerRes, pathPart: 'account',
    });
    customerAccount.addMethod('GET', li(customer.functions.getCustomerAccount), opts);

    // Customer Properties
    const customerProperties = new apigateway.Resource(this, 'customer-properties', {
      parent: customerRes, pathPart: 'properties',
    });
    customerProperties.addMethod('GET', li(property.functions.listPropertiesByCustomer), opts);
    customerProperties.addMethod('POST', li(property.functions.createProperty), opts);

    // Customer Payment Methods
    const customerPaymentMethods = new apigateway.Resource(this, 'customer-payment-methods', {
      parent: customerRes, pathPart: 'payment-methods',
    });
    customerPaymentMethods.addMethod('GET', li(billing.functions.listPaymentMethods), opts);
    customerPaymentMethods.addMethod('POST', li(billing.functions.createPaymentMethod), opts);

    // Customer Invoice Schedules
    const customerInvoiceSchedules = new apigateway.Resource(this, 'customer-invoice-schedules', {
      parent: customerRes, pathPart: 'invoice-schedules',
    });
    customerInvoiceSchedules.addMethod('GET', li(billing.functions.listInvoiceSchedules), opts);
    customerInvoiceSchedules.addMethod('POST', li(billing.functions.createInvoiceSchedule), opts);

    // Accounts / Delegates
    const accounts = new apigateway.Resource(this, 'accounts', {
      parent: apiRoot, pathPart: 'accounts',
    });
    const accountRes = new apigateway.Resource(this, 'account-item', {
      parent: accounts, pathPart: '{accountId}',
    });
    const accountDelegates = new apigateway.Resource(this, 'account-delegates', {
      parent: accountRes, pathPart: 'delegates',
    });
    accountDelegates.addMethod('GET', li(customer.functions.listDelegates), opts);
    accountDelegates.addMethod('POST', li(customer.functions.createDelegate), opts);

    // Delegates (top-level delete)
    const delegates = new apigateway.Resource(this, 'delegates', {
      parent: apiRoot, pathPart: 'delegates',
    });
    const delegateRes = new apigateway.Resource(this, 'delegate-item', {
      parent: delegates, pathPart: '{delegateId}',
    });
    delegateRes.addMethod('DELETE', li(customer.functions.deleteDelegate), opts);

    // Properties (top-level)
    const properties = new apigateway.Resource(this, 'properties', {
      parent: apiRoot, pathPart: 'properties',
    });
    const propertyRes = new apigateway.Resource(this, 'property-item', {
      parent: properties, pathPart: '{propertyId}',
    });
    propertyRes.addMethod('GET', li(property.functions.getProperty), opts);
    propertyRes.addMethod('PUT', li(property.functions.updateProperty), opts);
    propertyRes.addMethod('DELETE', li(property.functions.deleteProperty), opts);

    // Property Services by Property
    const propertyPropertyServices = new apigateway.Resource(this, 'property-services-nested', {
      parent: propertyRes, pathPart: 'services',
    });
    propertyPropertyServices.addMethod('GET', li(property.functions.listPropertyServices), opts);
    propertyPropertyServices.addMethod('POST', li(property.functions.createPropertyService), opts);

    // Plans
    const plans = new apigateway.Resource(this, 'plans', {
      parent: apiRoot, pathPart: 'plans',
    });
    plans.addMethod('GET', li(plan.functions.listPlans), opts);
    plans.addMethod('POST', li(plan.functions.createPlan), opts);
    const planRes = new apigateway.Resource(this, 'plan-item', {
      parent: plans, pathPart: '{planId}',
    });
    planRes.addMethod('GET', li(plan.functions.getPlan), opts);
    planRes.addMethod('PUT', li(plan.functions.updatePlan), opts);
    planRes.addMethod('DELETE', li(plan.functions.deletePlan), opts);

    // Plan Categories
    const planCategories = new apigateway.Resource(this, 'plan-categories', {
      parent: planRes, pathPart: 'categories',
    });
    planCategories.addMethod('GET', li(plan.functions.listPlanCategories), opts);
    planCategories.addMethod('POST', li(plan.functions.createPlanCategory), opts);
    const planCategoryRes = new apigateway.Resource(this, 'plan-category-item', {
      parent: planCategories, pathPart: '{categoryId}',
    });
    planCategoryRes.addMethod('DELETE', li(plan.functions.deletePlanCategory), opts);

    // Plan Services
    const planServices = new apigateway.Resource(this, 'plan-services', {
      parent: planRes, pathPart: 'services',
    });
    planServices.addMethod('GET', li(plan.functions.listPlanServices), opts);
    planServices.addMethod('POST', li(plan.functions.createPlanService), opts);
    const planServiceRes = new apigateway.Resource(this, 'plan-service-item', {
      parent: planServices, pathPart: '{serviceTypeId}',
    });
    planServiceRes.addMethod('DELETE', li(plan.functions.deletePlanService), opts);

    // Property Services (top-level)
    const propertyServicesRoot = new apigateway.Resource(this, 'property-services', {
      parent: apiRoot, pathPart: 'property-services',
    });
    const propertyServiceItem = new apigateway.Resource(this, 'property-service-item', {
      parent: propertyServicesRoot, pathPart: '{serviceId}',
    });
    propertyServiceItem.addMethod('GET', li(property.functions.getPropertyService), opts);
    propertyServiceItem.addMethod('PUT', li(property.functions.updatePropertyService), opts);
    propertyServiceItem.addMethod('DELETE', li(property.functions.deletePropertyService), opts);

    // Costs (nested under property-services)
    const serviceCosts = new apigateway.Resource(this, 'service-costs', {
      parent: propertyServiceItem, pathPart: 'costs',
    });
    serviceCosts.addMethod('GET', li(property.functions.listCosts), opts);
    serviceCosts.addMethod('POST', li(property.functions.createCost), opts);

    // Costs (top-level delete)
    const costs = new apigateway.Resource(this, 'costs', {
      parent: apiRoot, pathPart: 'costs',
    });
    const costRes = new apigateway.Resource(this, 'cost-item', {
      parent: costs, pathPart: '{costId}',
    });
    costRes.addMethod('DELETE', li(property.functions.deleteCost), opts);
  }
}
