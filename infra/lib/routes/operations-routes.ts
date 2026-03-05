import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaStack } from '../lambda-stack';

interface OperationsRouteStackProps {
  apiRoot: apigateway.IResource;
  authorizer: apigateway.IAuthorizer;
  workforce: LambdaStack;
  billing: LambdaStack;
  estimate: LambdaStack;
  organization: LambdaStack;
}

export class OperationsRouteStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: OperationsRouteStackProps) {
    super(scope, id);

    const { apiRoot, authorizer, workforce, billing, estimate, organization } = props;
    const opts: apigateway.MethodOptions = { authorizer };
    const li = (fn: lambda.IFunction) => new apigateway.LambdaIntegration(fn, { allowTestInvoke: false });

    // Employees
    const employees = new apigateway.Resource(this, 'employees', {
      parent: apiRoot, pathPart: 'employees',
    });
    employees.addMethod('GET', li(workforce.functions.listEmployees), opts);
    employees.addMethod('POST', li(workforce.functions.createEmployee), opts);
    const employeeRes = new apigateway.Resource(this, 'employee-item', {
      parent: employees, pathPart: '{employeeId}',
    });
    employeeRes.addMethod('GET', li(workforce.functions.getEmployee), opts);
    employeeRes.addMethod('PUT', li(workforce.functions.updateEmployee), opts);
    employeeRes.addMethod('DELETE', li(workforce.functions.deleteEmployee), opts);

    // Employee Servicer
    const employeeServicer = new apigateway.Resource(this, 'employee-servicer', {
      parent: employeeRes, pathPart: 'servicer',
    });
    employeeServicer.addMethod('POST', li(workforce.functions.createServicer), opts);

    // Employee Capabilities
    const employeeCapabilities = new apigateway.Resource(this, 'employee-capabilities', {
      parent: employeeRes, pathPart: 'capabilities',
    });
    employeeCapabilities.addMethod('GET', li(workforce.functions.listCapabilities), opts);
    employeeCapabilities.addMethod('POST', li(workforce.functions.createCapability), opts);

    // Employee Pay
    const employeePay = new apigateway.Resource(this, 'employee-pay', {
      parent: employeeRes, pathPart: 'pay',
    });
    employeePay.addMethod('GET', li(billing.functions.listPay), opts);
    employeePay.addMethod('POST', li(billing.functions.createPay), opts);

    // Servicers (top-level)
    const servicers = new apigateway.Resource(this, 'servicers', {
      parent: apiRoot, pathPart: 'servicers',
    });
    const servicerRes = new apigateway.Resource(this, 'servicer-item', {
      parent: servicers, pathPart: '{servicerId}',
    });
    servicerRes.addMethod('GET', li(workforce.functions.getServicer), opts);
    servicerRes.addMethod('PUT', li(workforce.functions.updateServicer), opts);

    // Capabilities (top-level delete)
    const capabilities = new apigateway.Resource(this, 'capabilities', {
      parent: apiRoot, pathPart: 'capabilities',
    });
    const capabilityRes = new apigateway.Resource(this, 'capability-item', {
      parent: capabilities, pathPart: '{capabilityId}',
    });
    capabilityRes.addMethod('DELETE', li(workforce.functions.deleteCapability), opts);

    // Service Schedules
    const serviceSchedules = new apigateway.Resource(this, 'service-schedules', {
      parent: apiRoot, pathPart: 'service-schedules',
    });
    serviceSchedules.addMethod('GET', li(workforce.functions.listServiceSchedules), opts);
    serviceSchedules.addMethod('POST', li(workforce.functions.createServiceSchedule), opts);
    const serviceScheduleRes = new apigateway.Resource(this, 'service-schedule-item', {
      parent: serviceSchedules, pathPart: '{serviceScheduleId}',
    });
    serviceScheduleRes.addMethod('GET', li(workforce.functions.getServiceSchedule), opts);
    serviceScheduleRes.addMethod('PUT', li(workforce.functions.updateServiceSchedule), opts);

    // Invoices
    const invoices = new apigateway.Resource(this, 'invoices', {
      parent: apiRoot, pathPart: 'invoices',
    });
    invoices.addMethod('GET', li(billing.functions.listInvoices), opts);
    invoices.addMethod('POST', li(billing.functions.createInvoice), opts);
    const invoiceRes = new apigateway.Resource(this, 'invoice-item', {
      parent: invoices, pathPart: '{invoiceId}',
    });
    invoiceRes.addMethod('GET', li(billing.functions.getInvoice), opts);
    invoiceRes.addMethod('PUT', li(billing.functions.updateInvoice), opts);

    // Estimates
    const estimates = new apigateway.Resource(this, 'estimates', {
      parent: apiRoot, pathPart: 'estimates',
    });
    estimates.addMethod('GET', li(estimate.functions.listEstimates), opts);
    estimates.addMethod('POST', li(estimate.functions.createEstimate), opts);
    const estimateRes = new apigateway.Resource(this, 'estimate-item', {
      parent: estimates, pathPart: '{estimateId}',
    });
    estimateRes.addMethod('GET', li(estimate.functions.getEstimate), opts);
    estimateRes.addMethod('PUT', li(estimate.functions.updateEstimate), opts);
    estimateRes.addMethod('DELETE', li(estimate.functions.deleteEstimate), opts);
    const estimateInvoice = new apigateway.Resource(this, 'estimate-invoice', {
      parent: estimateRes, pathPart: 'invoice',
    });
    estimateInvoice.addMethod('POST', li(estimate.functions.convertEstimateToInvoice), opts);

    // Payment Methods (top-level delete)
    const paymentMethods = new apigateway.Resource(this, 'payment-methods', {
      parent: apiRoot, pathPart: 'payment-methods',
    });
    const paymentMethodRes = new apigateway.Resource(this, 'payment-method-item', {
      parent: paymentMethods, pathPart: '{paymentMethodId}',
    });
    paymentMethodRes.addMethod('DELETE', li(billing.functions.deletePaymentMethod), opts);

    // Invoice Schedules (top-level)
    const invoiceSchedules = new apigateway.Resource(this, 'invoice-schedules', {
      parent: apiRoot, pathPart: 'invoice-schedules',
    });
    const invoiceScheduleRes = new apigateway.Resource(this, 'invoice-schedule-item', {
      parent: invoiceSchedules, pathPart: '{invoiceScheduleId}',
    });
    invoiceScheduleRes.addMethod('PUT', li(billing.functions.updateInvoiceSchedule), opts);
    invoiceScheduleRes.addMethod('DELETE', li(billing.functions.deleteInvoiceSchedule), opts);

    // Pay (top-level)
    const payRoot = new apigateway.Resource(this, 'pay', {
      parent: apiRoot, pathPart: 'pay',
    });
    const payItem = new apigateway.Resource(this, 'pay-item', {
      parent: payRoot, pathPart: '{payId}',
    });
    payItem.addMethod('PUT', li(billing.functions.updatePay), opts);
    payItem.addMethod('DELETE', li(billing.functions.deletePay), opts);

    // Pay Schedules
    const paySchedules = new apigateway.Resource(this, 'pay-schedules', {
      parent: apiRoot, pathPart: 'pay-schedules',
    });
    paySchedules.addMethod('GET', li(billing.functions.listPaySchedules), opts);
    paySchedules.addMethod('POST', li(billing.functions.createPaySchedule), opts);
    const payScheduleRes = new apigateway.Resource(this, 'pay-schedule-item', {
      parent: paySchedules, pathPart: '{payScheduleId}',
    });
    payScheduleRes.addMethod('GET', li(billing.functions.getPaySchedule), opts);
    payScheduleRes.addMethod('PUT', li(billing.functions.updatePaySchedule), opts);
    payScheduleRes.addMethod('DELETE', li(billing.functions.deletePaySchedule), opts);

    // Organizations
    const organizations = new apigateway.Resource(this, 'organizations', {
      parent: apiRoot, pathPart: 'organizations',
    });
    organizations.addMethod('GET', li(organization.functions.listOrganizations), opts);
    organizations.addMethod('POST', li(organization.functions.createOrganization), opts);
    const organizationRes = new apigateway.Resource(this, 'organization-item', {
      parent: organizations, pathPart: '{organizationId}',
    });
    organizationRes.addMethod('GET', li(organization.functions.getOrganization), opts);
    organizationRes.addMethod('PUT', li(organization.functions.updateOrganization), opts);
    organizationRes.addMethod('DELETE', li(organization.functions.deleteOrganization), opts);

    // Admin Users
    const adminUsers = new apigateway.Resource(this, 'admin-users', {
      parent: apiRoot, pathPart: 'admin-users',
    });
    adminUsers.addMethod('GET', li(organization.functions.listAdminUsers), opts);

    // Organization Config
    const orgConfig = new apigateway.Resource(this, 'org-config', {
      parent: organizationRes, pathPart: 'config',
    });
    orgConfig.addMethod('GET', li(organization.functions.getOrgConfig), opts);
    orgConfig.addMethod('PUT', li(organization.functions.updateOrgConfig), opts);

    // Organization Secrets
    const orgSecrets = new apigateway.Resource(this, 'org-secrets', {
      parent: organizationRes, pathPart: 'secrets',
    });
    orgSecrets.addMethod('GET', li(organization.functions.getOrgSecrets), opts);
    const orgSecretKey = new apigateway.Resource(this, 'org-secret-key', {
      parent: orgSecrets, pathPart: '{key}',
    });
    orgSecretKey.addMethod('PUT', li(organization.functions.setOrgSecret), opts);
  }
}
