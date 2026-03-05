import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaStack } from '../lambda-stack';

interface LookupRouteStackProps {
  apiRoot: apigateway.IResource;
  authorizer: apigateway.IAuthorizer;
  lookup: LambdaStack;
  plan: LambdaStack;
}

export class LookupRouteStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: LookupRouteStackProps) {
    super(scope, id);

    const { apiRoot, authorizer, lookup, plan } = props;
    const opts: apigateway.MethodOptions = { authorizer };
    const li = (fn: lambda.IFunction) => new apigateway.LambdaIntegration(fn, { allowTestInvoke: false });

    // Property Types
    const propertyTypes = new apigateway.Resource(this, 'property-types', {
      parent: apiRoot, pathPart: 'property-types',
    });
    propertyTypes.addMethod('GET', li(lookup.functions.listPropertyTypes), opts);
    propertyTypes.addMethod('POST', li(lookup.functions.createPropertyType), opts);
    const propertyTypeRes = new apigateway.Resource(this, 'property-type-item', {
      parent: propertyTypes, pathPart: '{propertyTypeId}',
    });
    propertyTypeRes.addMethod('GET', li(lookup.functions.getPropertyType), opts);
    propertyTypeRes.addMethod('PUT', li(lookup.functions.updatePropertyType), opts);
    propertyTypeRes.addMethod('DELETE', li(lookup.functions.deletePropertyType), opts);

    // Service Types
    const serviceTypes = new apigateway.Resource(this, 'service-types', {
      parent: apiRoot, pathPart: 'service-types',
    });
    serviceTypes.addMethod('GET', li(lookup.functions.listServiceTypes), opts);
    serviceTypes.addMethod('POST', li(lookup.functions.createServiceType), opts);
    const serviceTypeRes = new apigateway.Resource(this, 'service-type-item', {
      parent: serviceTypes, pathPart: '{serviceTypeId}',
    });
    serviceTypeRes.addMethod('GET', li(lookup.functions.getServiceType), opts);
    serviceTypeRes.addMethod('PUT', li(lookup.functions.updateServiceType), opts);
    serviceTypeRes.addMethod('DELETE', li(lookup.functions.deleteServiceType), opts);

    // Service Type Categories (nested under service types)
    const serviceTypeCategories = new apigateway.Resource(this, 'service-type-categories', {
      parent: serviceTypeRes, pathPart: 'categories',
    });
    serviceTypeCategories.addMethod('GET', li(lookup.functions.listServiceTypeCategories), opts);
    serviceTypeCategories.addMethod('POST', li(lookup.functions.createServiceTypeCategory), opts);
    const serviceTypeCategoryRes = new apigateway.Resource(this, 'service-type-category-item', {
      parent: serviceTypeCategories, pathPart: '{categoryId}',
    });
    serviceTypeCategoryRes.addMethod('DELETE', li(lookup.functions.deleteServiceTypeCategory), opts);

    // Categories
    const categories = new apigateway.Resource(this, 'categories', {
      parent: apiRoot, pathPart: 'categories',
    });
    categories.addMethod('GET', li(lookup.functions.listCategories), opts);
    categories.addMethod('POST', li(lookup.functions.createCategory), opts);
    const categoryRes = new apigateway.Resource(this, 'category-item', {
      parent: categories, pathPart: '{categoryId}',
    });
    categoryRes.addMethod('GET', li(lookup.functions.getCategory), opts);
    categoryRes.addMethod('PUT', li(lookup.functions.updateCategory), opts);
    categoryRes.addMethod('DELETE', li(lookup.functions.deleteCategory), opts);

    // Public (unauthenticated) routes
    const publicRes = new apigateway.Resource(this, 'public', {
      parent: apiRoot, pathPart: 'public',
    });
    const publicServiceTypes = new apigateway.Resource(this, 'public-service-types', {
      parent: publicRes, pathPart: 'service-types',
    });
    publicServiceTypes.addMethod('GET', li(lookup.functions.listPublicServiceTypes));
    const publicPropertyTypes = new apigateway.Resource(this, 'public-property-types', {
      parent: publicRes, pathPart: 'property-types',
    });
    publicPropertyTypes.addMethod('GET', li(lookup.functions.listPublicPropertyTypes));
    const publicCategories = new apigateway.Resource(this, 'public-categories', {
      parent: publicRes, pathPart: 'categories',
    });
    publicCategories.addMethod('GET', li(lookup.functions.listPublicCategories));
    const publicPlans = new apigateway.Resource(this, 'public-plans', {
      parent: publicRes, pathPart: 'plans',
    });
    publicPlans.addMethod('GET', li(plan.functions.listPublicPlans));

    // Cost Types
    const costTypes = new apigateway.Resource(this, 'cost-types', {
      parent: apiRoot, pathPart: 'cost-types',
    });
    costTypes.addMethod('GET', li(lookup.functions.listCostTypes), opts);
    costTypes.addMethod('POST', li(lookup.functions.createCostType), opts);
    const costTypeRes = new apigateway.Resource(this, 'cost-type-item', {
      parent: costTypes, pathPart: '{costTypeId}',
    });
    costTypeRes.addMethod('GET', li(lookup.functions.getCostType), opts);
    costTypeRes.addMethod('PUT', li(lookup.functions.updateCostType), opts);
    costTypeRes.addMethod('DELETE', li(lookup.functions.deleteCostType), opts);
  }
}
