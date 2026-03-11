import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ─── Security Schemes ───
registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
        'JWT access token from Amazon Cognito. Obtain by authenticating via the Cognito Hosted UI or the AWS Amplify Auth library. ' +
        'The token contains the user\'s organizationId in custom claims, which is used for multi-tenant data isolation. ' +
        'Include the token in the Authorization header: `Bearer <token>`.',
});

// ─── Shared Schemas ───
const ErrorResponseSchema = z.object({
    error: z.object({
        code: z.string().openapi({ example: 'NOT_FOUND' }),
        message: z.string().openapi({ example: 'Resource not found' }),
        details: z.any().optional().openapi({ example: [{ path: 'name', message: 'Required' }] }),
        requestId: z.string().optional().openapi({ example: 'abc-123-def' }),
    }),
}).openapi('ErrorResponse');

registry.register('ErrorResponse', ErrorResponseSchema);

const PaginatedQueryParams = {
    limit: {
        in: 'query' as const, name: 'limit', required: false,
        schema: { type: 'integer' as const, minimum: 1, maximum: 100, default: 25 },
        description: 'Maximum number of items to return (1-100, default 25)',
    },
    cursor: {
        in: 'query' as const, name: 'cursor', required: false,
        schema: { type: 'string' as const },
        description: 'Opaque pagination cursor from a previous response',
    },
};

// ─── Import All Schemas ───
import { CreateCustomerSchema } from './customer-schemas';
import { UpdateCustomerSchema } from './customer-schemas';
import { CreatePropertySchema } from './property-schemas';
import { UpdatePropertySchema } from './property-schemas';
import { CreatePropertyTypeSchema } from './property-type-schemas';
import { UpdatePropertyTypeSchema } from './property-type-schemas';
import { CreateServiceTypeSchema } from './service-type-schemas';
import { UpdateServiceTypeSchema } from './service-type-schemas';
import { CreateCostTypeSchema } from './cost-type-schemas';
import { UpdateCostTypeSchema } from './cost-type-schemas';
import { CreatePlanSchema } from './plan-schemas';
import { UpdatePlanSchema } from './plan-schemas';
import { CreatePlanServiceSchema } from './plan-service-schemas';
import { CreatePropertyServiceSchema } from './property-service-schemas';
import { UpdatePropertyServiceSchema } from './property-service-schemas';
import { CreateCostSchema } from './cost-schemas';
import { CreateEmployeeSchema } from './employee-schemas';
import { UpdateEmployeeSchema } from './employee-schemas';
import { CreateServicerSchema } from './servicer-schemas';
import { UpdateServicerSchema } from './servicer-schemas';
import { CreateCapabilitySchema } from './capability-schemas';
import { CreateServiceScheduleSchema } from './service-schedule-schemas';
import { UpdateServiceScheduleSchema } from './service-schedule-schemas';
import { CreateInvoiceSchema, LineItemSchema } from './invoice-schemas';
import { UpdateInvoiceSchema } from './invoice-schemas';
import { GenerateEstimateSchema, EstimateLineItemSchema } from './estimate-schemas';
import { UpdateEstimateSchema } from './estimate-schemas';
import { CreatePaymentMethodSchema } from './payment-method-schemas';
import { CreateInvoiceScheduleSchema } from './invoice-schedule-schemas';
import { UpdateInvoiceScheduleSchema } from './invoice-schedule-schemas';
import { CreatePaySchema } from './pay-schemas';
import { UpdatePaySchema } from './pay-schemas';
import { CreatePayScheduleSchema } from './pay-schedule-schemas';
import { UpdatePayScheduleSchema } from './pay-schedule-schemas';
import { CreateDelegateSchema } from './delegate-schemas';
import { CreateCategorySchema } from './category-schemas';
import { UpdateCategorySchema } from './category-schemas';
import { CreateEntityCategorySchema } from './entity-category-schemas';
import { CreateOrganizationSchema, UpdateOrganizationSchema, UpdateOrgConfigSchema, SetOrgSecretSchema } from './organization-schemas';
import { SetStripeKeysSchema } from './integration-schemas';
import { CreateSubcontractorSchema, UpdateSubcontractorSchema } from './subcontractor-schemas';
import { CreateSubcontractorRateSchema, UpdateSubcontractorRateSchema } from './subcontractor-rate-schemas';

// ─── Register All Schemas ───
registry.register('CreateCustomer', CreateCustomerSchema);
registry.register('UpdateCustomer', UpdateCustomerSchema);
registry.register('CreateProperty', CreatePropertySchema);
registry.register('UpdateProperty', UpdatePropertySchema);
registry.register('CreatePropertyType', CreatePropertyTypeSchema);
registry.register('UpdatePropertyType', UpdatePropertyTypeSchema);
registry.register('CreateServiceType', CreateServiceTypeSchema);
registry.register('UpdateServiceType', UpdateServiceTypeSchema);
registry.register('CreateCostType', CreateCostTypeSchema);
registry.register('UpdateCostType', UpdateCostTypeSchema);
registry.register('CreatePlan', CreatePlanSchema);
registry.register('UpdatePlan', UpdatePlanSchema);
registry.register('CreatePlanService', CreatePlanServiceSchema);
registry.register('CreatePropertyService', CreatePropertyServiceSchema);
registry.register('UpdatePropertyService', UpdatePropertyServiceSchema);
registry.register('CreateCost', CreateCostSchema);
registry.register('CreateEmployee', CreateEmployeeSchema);
registry.register('UpdateEmployee', UpdateEmployeeSchema);
registry.register('CreateServicer', CreateServicerSchema);
registry.register('UpdateServicer', UpdateServicerSchema);
registry.register('CreateCapability', CreateCapabilitySchema);
registry.register('CreateServiceSchedule', CreateServiceScheduleSchema);
registry.register('UpdateServiceSchedule', UpdateServiceScheduleSchema);
registry.register('LineItem', LineItemSchema);
registry.register('CreateInvoice', CreateInvoiceSchema);
registry.register('UpdateInvoice', UpdateInvoiceSchema);
registry.register('EstimateLineItem', EstimateLineItemSchema);
registry.register('GenerateEstimate', GenerateEstimateSchema);
registry.register('UpdateEstimate', UpdateEstimateSchema);
registry.register('CreatePaymentMethod', CreatePaymentMethodSchema);
registry.register('CreateInvoiceSchedule', CreateInvoiceScheduleSchema);
registry.register('UpdateInvoiceSchedule', UpdateInvoiceScheduleSchema);
registry.register('CreatePay', CreatePaySchema);
registry.register('UpdatePay', UpdatePaySchema);
registry.register('CreatePaySchedule', CreatePayScheduleSchema);
registry.register('UpdatePaySchedule', UpdatePayScheduleSchema);
registry.register('CreateDelegate', CreateDelegateSchema);
registry.register('CreateCategory', CreateCategorySchema);
registry.register('UpdateCategory', UpdateCategorySchema);
registry.register('CreateEntityCategory', CreateEntityCategorySchema);
registry.register('CreateOrganization', CreateOrganizationSchema);
registry.register('UpdateOrganization', UpdateOrganizationSchema);
registry.register('UpdateOrgConfig', UpdateOrgConfigSchema);
registry.register('SetOrgSecret', SetOrgSecretSchema);
registry.register('SetStripeKeys', SetStripeKeysSchema);
registry.register('CreateSubcontractor', CreateSubcontractorSchema);
registry.register('UpdateSubcontractor', UpdateSubcontractorSchema);
registry.register('CreateSubcontractorRate', CreateSubcontractorRateSchema);
registry.register('UpdateSubcontractorRate', UpdateSubcontractorRateSchema);

// ─── Helper: standard responses ───
const jsonContent = (schema: z.ZodType) => ({ content: { 'application/json': { schema } } });
const errorRef = { $ref: '#/components/schemas/ErrorResponse' };
const errorResponses = {
    400: { description: 'Validation error — check the `details` array for field-level messages', ...jsonContent(ErrorResponseSchema) },
    401: { description: 'Missing or invalid Bearer token' },
    403: { description: 'Insufficient permissions for this action' },
    404: { description: 'Resource not found', ...jsonContent(ErrorResponseSchema) },
    500: { description: 'Internal server error', ...jsonContent(ErrorResponseSchema) },
};
const security = [{ BearerAuth: [] }];

// ─── Helper: register a CRUD resource ───
type CrudOpts = {
    tag: string;
    basePath: string;
    paramName: string;
    createSchema?: z.ZodType;
    updateSchema?: z.ZodType;
    resourceName: string;
    description: string;
    /** If true, skip the list/create on the base path */
    skipCollection?: boolean;
    /** If true, skip the get on the item path */
    skipGet?: boolean;
    /** If true, skip delete */
    skipDelete?: boolean;
};

function registerCrud(opts: CrudOpts) {
    const { tag, basePath, paramName, createSchema, updateSchema, resourceName, description, skipCollection, skipGet, skipDelete } = opts;
    const pathParam = {
        in: 'path' as const, name: paramName, required: true,
        schema: { type: 'string' as const }, description: `${resourceName} ID`,
    };

    if (!skipCollection) {
        registry.registerPath({
            method: 'get', path: basePath, tags: [tag], security,
            summary: `List ${resourceName}s`,
            description: `Returns a paginated list of ${resourceName.toLowerCase()}s. ${description}`,
            parameters: [PaginatedQueryParams.limit, PaginatedQueryParams.cursor],
            responses: {
                200: { description: `Array of ${resourceName.toLowerCase()} objects with optional pagination cursor` },
                ...errorResponses,
            },
        });

        if (createSchema) {
            registry.registerPath({
                method: 'post', path: basePath, tags: [tag], security,
                summary: `Create ${resourceName}`,
                description: `Create a new ${resourceName.toLowerCase()}. ${description}`,
                request: { body: jsonContent(createSchema) },
                responses: {
                    201: { description: `${resourceName} created successfully` },
                    ...errorResponses,
                },
            });
        }
    }

    if (!skipGet) {
        registry.registerPath({
            method: 'get', path: `${basePath}/{${paramName}}`, tags: [tag], security,
            summary: `Get ${resourceName}`,
            description: `Retrieve a single ${resourceName.toLowerCase()} by ID.`,
            parameters: [pathParam],
            responses: {
                200: { description: `${resourceName} object` },
                ...errorResponses,
            },
        });
    }

    if (updateSchema) {
        registry.registerPath({
            method: 'put', path: `${basePath}/{${paramName}}`, tags: [tag], security,
            summary: `Update ${resourceName}`,
            description: `Update an existing ${resourceName.toLowerCase()}. Only provided fields are changed.`,
            parameters: [pathParam],
            request: { body: jsonContent(updateSchema) },
            responses: {
                200: { description: `Updated ${resourceName.toLowerCase()} object` },
                ...errorResponses,
            },
        });
    }

    if (!skipDelete) {
        registry.registerPath({
            method: 'delete', path: `${basePath}/{${paramName}}`, tags: [tag], security,
            summary: `Delete ${resourceName}`,
            description: `Permanently delete a ${resourceName.toLowerCase()}.`,
            parameters: [pathParam],
            responses: {
                200: { description: `${resourceName} deleted` },
                ...errorResponses,
            },
        });
    }
}

// ══════════════════════════════════════════════════════════════════
//  LOOKUP ENTITIES (reference data)
// ══════════════════════════════════════════════════════════════════

registerCrud({
    tag: 'Property Types', basePath: '/property-types', paramName: 'propertyTypeId',
    createSchema: CreatePropertyTypeSchema, updateSchema: UpdatePropertyTypeSchema,
    resourceName: 'Property Type',
    description: 'Property types define categories of properties (e.g., Residential, Commercial, HOA). These are shared across all organizations (organizationId = "GLOBAL").',
});

registerCrud({
    tag: 'Service Types', basePath: '/service-types', paramName: 'serviceTypeId',
    createSchema: CreateServiceTypeSchema, updateSchema: UpdateServiceTypeSchema,
    resourceName: 'Service Type',
    description: 'Service types define the services offered (e.g., Lawn Mowing, Pest Control, Window Cleaning). Includes pricing configuration with basePrice, ratePerUnit, measurement keys, and scheduling frequency.',
});

// Service Type Categories
registry.registerPath({
    method: 'get', path: '/service-types/{serviceTypeId}/categories', tags: ['Service Types'], security,
    summary: 'List categories for a service type',
    description: 'Get all categories assigned to a specific service type.',
    parameters: [{ in: 'path', name: 'serviceTypeId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Array of category assignments' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/service-types/{serviceTypeId}/categories', tags: ['Service Types'], security,
    summary: 'Assign category to service type',
    description: 'Link a category to a service type for organizational grouping.',
    parameters: [{ in: 'path', name: 'serviceTypeId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateEntityCategorySchema) },
    responses: { 201: { description: 'Category assigned' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/service-types/{serviceTypeId}/categories/{categoryId}', tags: ['Service Types'], security,
    summary: 'Remove category from service type',
    parameters: [
        { in: 'path', name: 'serviceTypeId', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Category removed' }, ...errorResponses },
});

registerCrud({
    tag: 'Categories', basePath: '/categories', paramName: 'categoryId',
    createSchema: CreateCategorySchema, updateSchema: UpdateCategorySchema,
    resourceName: 'Category',
    description: 'Categories are labels used to group service types (e.g., "Exterior", "Interior", "Seasonal"). They help organize services for display and filtering.',
});

registerCrud({
    tag: 'Cost Types', basePath: '/cost-types', paramName: 'costTypeId',
    createSchema: CreateCostTypeSchema, updateSchema: UpdateCostTypeSchema,
    resourceName: 'Cost Type',
    description: 'Cost types classify operational costs associated with property services (e.g., "Materials", "Equipment Rental", "One-Time Setup").',
});

// ── Public (unauthenticated) routes ──
const publicTag = 'Public';
registry.registerPath({
    method: 'get', path: '/public/service-types', tags: [publicTag],
    summary: 'List service types (public)',
    description: 'Returns all active service types. No authentication required. Intended for customer-facing websites and marketing pages.',
    responses: { 200: { description: 'Array of service type objects' } },
});
registry.registerPath({
    method: 'get', path: '/public/property-types', tags: [publicTag],
    summary: 'List property types (public)',
    description: 'Returns all active property types. No authentication required.',
    responses: { 200: { description: 'Array of property type objects' } },
});
registry.registerPath({
    method: 'get', path: '/public/categories', tags: [publicTag],
    summary: 'List categories (public)',
    description: 'Returns all categories. No authentication required.',
    responses: { 200: { description: 'Array of category objects' } },
});
registry.registerPath({
    method: 'get', path: '/public/plans', tags: [publicTag],
    summary: 'List plans (public)',
    description: 'Returns all active plans with pricing. No authentication required. Used for customer sign-up flows.',
    responses: { 200: { description: 'Array of plan objects with pricing' } },
});

// ══════════════════════════════════════════════════════════════════
//  CUSTOMERS & ACCOUNTS
// ══════════════════════════════════════════════════════════════════

registerCrud({
    tag: 'Customers', basePath: '/customers', paramName: 'customerId',
    createSchema: CreateCustomerSchema, updateSchema: UpdateCustomerSchema,
    resourceName: 'Customer',
    description: 'Customers are the property owners or managers. Creating a customer also creates an associated Account via a DynamoDB TransactWrite. Customers are scoped to the authenticated user\'s organization.',
});

registry.registerPath({
    method: 'get', path: '/customers/{customerId}/account', tags: ['Customers'], security,
    summary: 'Get customer account',
    description: 'Retrieve the Account record associated with this customer. The Account stores billing configuration, Cognito user link, and plan subscription.',
    parameters: [{ in: 'path', name: 'customerId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Account object' }, ...errorResponses },
});

// Customer Properties
registry.registerPath({
    method: 'get', path: '/customers/{customerId}/properties', tags: ['Properties'], security,
    summary: 'List properties by customer',
    description: 'Returns all properties belonging to a specific customer.',
    parameters: [
        { in: 'path', name: 'customerId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of property objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/customers/{customerId}/properties', tags: ['Properties'], security,
    summary: 'Create property for customer',
    description: 'Create a new property linked to the given customer. Properties store address, lot size, and dynamic measurements (e.g., `{ lawnSqft: 5000, gutterLinearFeet: 150 }`) used for estimate pricing.',
    parameters: [{ in: 'path', name: 'customerId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreatePropertySchema) },
    responses: { 201: { description: 'Property created' }, ...errorResponses },
});

// Customer Payment Methods
registry.registerPath({
    method: 'get', path: '/customers/{customerId}/payment-methods', tags: ['Payment Methods'], security,
    summary: 'List payment methods for customer',
    description: 'Returns all payment methods on file for a customer.',
    parameters: [
        { in: 'path', name: 'customerId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of payment method objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/customers/{customerId}/payment-methods', tags: ['Payment Methods'], security,
    summary: 'Add payment method for customer',
    description: 'Add a new payment method (credit card, debit card, bank account, or ACH) for a customer.',
    parameters: [{ in: 'path', name: 'customerId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreatePaymentMethodSchema) },
    responses: { 201: { description: 'Payment method created' }, ...errorResponses },
});

// Customer Invoice Schedules
registry.registerPath({
    method: 'get', path: '/customers/{customerId}/invoice-schedules', tags: ['Invoice Schedules'], security,
    summary: 'List invoice schedules for customer',
    description: 'Returns all invoice schedules for a customer. Invoice schedules define when invoices are automatically generated.',
    parameters: [
        { in: 'path', name: 'customerId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of invoice schedule objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/customers/{customerId}/invoice-schedules', tags: ['Invoice Schedules'], security,
    summary: 'Create invoice schedule for customer',
    description: 'Set up an automatic invoice generation schedule for a customer.',
    parameters: [{ in: 'path', name: 'customerId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateInvoiceScheduleSchema) },
    responses: { 201: { description: 'Invoice schedule created' }, ...errorResponses },
});

// ── Delegates ──
registry.registerPath({
    method: 'get', path: '/accounts/{accountId}/delegates', tags: ['Delegates'], security,
    summary: 'List delegates for account',
    description: 'Returns all delegates (authorized secondary users) for an account. Delegates can perform actions on behalf of the account holder based on their permissions.',
    parameters: [
        { in: 'path', name: 'accountId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of delegate objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/accounts/{accountId}/delegates', tags: ['Delegates'], security,
    summary: 'Add delegate to account',
    description: 'Invite a delegate to an account with specified permissions.',
    parameters: [{ in: 'path', name: 'accountId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateDelegateSchema) },
    responses: { 201: { description: 'Delegate created' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/delegates/{delegateId}', tags: ['Delegates'], security,
    summary: 'Remove delegate',
    description: 'Permanently remove a delegate from their account.',
    parameters: [{ in: 'path', name: 'delegateId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Delegate removed' }, ...errorResponses },
});

// ══════════════════════════════════════════════════════════════════
//  PROPERTIES
// ══════════════════════════════════════════════════════════════════

// Top-level property routes (get/update/delete only — create is under /customers/{id}/properties)
registry.registerPath({
    method: 'get', path: '/properties/{propertyId}', tags: ['Properties'], security,
    summary: 'Get property',
    description: 'Retrieve a single property by ID. Includes address, lot size, measurements, and linked property type.',
    parameters: [{ in: 'path', name: 'propertyId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Property object' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/properties/{propertyId}', tags: ['Properties'], security,
    summary: 'Update property',
    description: 'Update property details. Only provided fields are changed. Update measurements to adjust estimate pricing calculations.',
    parameters: [{ in: 'path', name: 'propertyId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdatePropertySchema) },
    responses: { 200: { description: 'Updated property object' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/properties/{propertyId}', tags: ['Properties'], security,
    summary: 'Delete property',
    parameters: [{ in: 'path', name: 'propertyId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Property deleted' }, ...errorResponses },
});

// ── Property Services ──
registry.registerPath({
    method: 'get', path: '/properties/{propertyId}/services', tags: ['Property Services'], security,
    summary: 'List services for property',
    description: 'Returns all active services assigned to a property (e.g., lawn mowing, pest control).',
    parameters: [
        { in: 'path', name: 'propertyId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of property service objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/properties/{propertyId}/services', tags: ['Property Services'], security,
    summary: 'Add service to property',
    description: 'Assign a service type to a property with optional plan linkage and scheduling frequency.',
    parameters: [{ in: 'path', name: 'propertyId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreatePropertyServiceSchema) },
    responses: { 201: { description: 'Property service created' }, ...errorResponses },
});
registry.registerPath({
    method: 'get', path: '/property-services/{serviceId}', tags: ['Property Services'], security,
    summary: 'Get property service',
    parameters: [{ in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Property service object' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/property-services/{serviceId}', tags: ['Property Services'], security,
    summary: 'Update property service',
    description: 'Update service status, plan linkage, or scheduling. Set status to "cancelled" to end service.',
    parameters: [{ in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdatePropertyServiceSchema) },
    responses: { 200: { description: 'Updated property service' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/property-services/{serviceId}', tags: ['Property Services'], security,
    summary: 'Delete property service',
    parameters: [{ in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Property service deleted' }, ...errorResponses },
});

// ── Costs ──
registry.registerPath({
    method: 'get', path: '/property-services/{serviceId}/costs', tags: ['Costs'], security,
    summary: 'List costs for property service',
    description: 'Returns all costs associated with a property service. Costs represent operational expenses (materials, labor, etc.) in cents.',
    parameters: [
        { in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of cost objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/property-services/{serviceId}/costs', tags: ['Costs'], security,
    summary: 'Add cost to property service',
    description: 'Record a cost against a property service. All monetary values are in cents (e.g., 5000 = $50.00).',
    parameters: [{ in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateCostSchema) },
    responses: { 201: { description: 'Cost created' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/costs/{costId}', tags: ['Costs'], security,
    summary: 'Delete cost',
    parameters: [{ in: 'path', name: 'costId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Cost deleted' }, ...errorResponses },
});

// ══════════════════════════════════════════════════════════════════
//  PLANS
// ══════════════════════════════════════════════════════════════════

registerCrud({
    tag: 'Plans', basePath: '/plans', paramName: 'planId',
    createSchema: CreatePlanSchema, updateSchema: UpdatePlanSchema,
    resourceName: 'Plan',
    description: 'Plans are subscription bundles grouping multiple service types at a bundled price. Pricing is in cents (e.g., monthlyPrice: 14999 = $149.99).',
});

// Plan Categories
registry.registerPath({
    method: 'get', path: '/plans/{planId}/categories', tags: ['Plans'], security,
    summary: 'List categories for plan',
    parameters: [{ in: 'path', name: 'planId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Array of category assignments' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/plans/{planId}/categories', tags: ['Plans'], security,
    summary: 'Assign category to plan',
    parameters: [{ in: 'path', name: 'planId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateEntityCategorySchema) },
    responses: { 201: { description: 'Category assigned' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/plans/{planId}/categories/{categoryId}', tags: ['Plans'], security,
    summary: 'Remove category from plan',
    parameters: [
        { in: 'path', name: 'planId', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'categoryId', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Category removed' }, ...errorResponses },
});

// Plan Services
registry.registerPath({
    method: 'get', path: '/plans/{planId}/services', tags: ['Plan Services'], security,
    summary: 'List services in plan',
    description: 'Returns all service types included in a plan with their included visit counts and frequency.',
    parameters: [{ in: 'path', name: 'planId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Array of plan service objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/plans/{planId}/services', tags: ['Plan Services'], security,
    summary: 'Add service to plan',
    description: 'Include a service type in this plan with the number of included visits and frequency.',
    parameters: [{ in: 'path', name: 'planId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreatePlanServiceSchema) },
    responses: { 201: { description: 'Plan service created' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/plans/{planId}/services/{serviceTypeId}', tags: ['Plan Services'], security,
    summary: 'Remove service from plan',
    parameters: [
        { in: 'path', name: 'planId', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'serviceTypeId', required: true, schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Service removed from plan' }, ...errorResponses },
});

// ══════════════════════════════════════════════════════════════════
//  EMPLOYEES & WORKFORCE
// ══════════════════════════════════════════════════════════════════

registerCrud({
    tag: 'Employees', basePath: '/employees', paramName: 'employeeId',
    createSchema: CreateEmployeeSchema, updateSchema: UpdateEmployeeSchema,
    resourceName: 'Employee',
    description: 'Employees are staff members of the property management organization. They can be assigned as servicers, have capabilities, and receive pay.',
});

// Employee Servicer
registry.registerPath({
    method: 'post', path: '/employees/{employeeId}/servicer', tags: ['Servicers'], security,
    summary: 'Create servicer profile for employee',
    description: 'Promote an employee to a field servicer by creating their servicer profile with service area and capacity settings.',
    parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateServicerSchema) },
    responses: { 201: { description: 'Servicer profile created' }, ...errorResponses },
});

// Servicers (top-level)
registry.registerPath({
    method: 'get', path: '/servicers/{servicerId}', tags: ['Servicers'], security,
    summary: 'Get servicer',
    description: 'Retrieve a servicer profile including service area, max daily jobs, and rating.',
    parameters: [{ in: 'path', name: 'servicerId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Servicer object' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/servicers/{servicerId}', tags: ['Servicers'], security,
    summary: 'Update servicer',
    description: 'Update servicer profile settings.',
    parameters: [{ in: 'path', name: 'servicerId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdateServicerSchema) },
    responses: { 200: { description: 'Updated servicer' }, ...errorResponses },
});

// Employee Capabilities
registry.registerPath({
    method: 'get', path: '/employees/{employeeId}/capabilities', tags: ['Capabilities'], security,
    summary: 'List capabilities for employee',
    description: 'Returns all service type capabilities and skill levels for an employee.',
    parameters: [
        { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of capability objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/employees/{employeeId}/capabilities', tags: ['Capabilities'], security,
    summary: 'Add capability to employee',
    description: 'Record an employee\'s capability for a service type with their skill level (beginner, intermediate, expert) and optional certification date.',
    parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateCapabilitySchema) },
    responses: { 201: { description: 'Capability created' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/capabilities/{capabilityId}', tags: ['Capabilities'], security,
    summary: 'Delete capability',
    parameters: [{ in: 'path', name: 'capabilityId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Capability deleted' }, ...errorResponses },
});

// Employee Pay
registry.registerPath({
    method: 'get', path: '/employees/{employeeId}/pay', tags: ['Pay'], security,
    summary: 'List pay records for employee',
    description: 'Returns all pay rate records for an employee (hourly, salary, commission, bonus).',
    parameters: [
        { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of pay records' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/employees/{employeeId}/pay', tags: ['Pay'], security,
    summary: 'Create pay record for employee',
    description: 'Set a pay rate for an employee. Rate is in cents (e.g., 150000 = $1,500.00 for salary, or 2500 = $25.00 for hourly).',
    parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreatePaySchema) },
    responses: { 201: { description: 'Pay record created' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/pay/{payId}', tags: ['Pay'], security,
    summary: 'Update pay record',
    parameters: [{ in: 'path', name: 'payId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdatePaySchema) },
    responses: { 200: { description: 'Updated pay record' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/pay/{payId}', tags: ['Pay'], security,
    summary: 'Delete pay record',
    parameters: [{ in: 'path', name: 'payId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Pay record deleted' }, ...errorResponses },
});

// ── Service Schedules ──
registerCrud({
    tag: 'Service Schedules', basePath: '/service-schedules', paramName: 'serviceScheduleId',
    createSchema: CreateServiceScheduleSchema, updateSchema: UpdateServiceScheduleSchema,
    resourceName: 'Service Schedule', skipDelete: true,
    description: 'Service schedules assign a servicer to perform a property service on a specific date/time. Status lifecycle: scheduled -> in_progress -> completed (or cancelled).',
});

// ══════════════════════════════════════════════════════════════════
//  BILLING
// ══════════════════════════════════════════════════════════════════

registerCrud({
    tag: 'Invoices', basePath: '/invoices', paramName: 'invoiceId',
    createSchema: CreateInvoiceSchema, updateSchema: UpdateInvoiceSchema,
    resourceName: 'Invoice', skipDelete: true,
    description: 'Invoices track billing for services rendered. All monetary values (subtotal, tax, total, line item prices) are in cents. Status lifecycle: draft -> sent -> paid (or overdue -> cancelled).',
});

// Estimates
registerCrud({
    tag: 'Estimates', basePath: '/estimates', paramName: 'estimateId',
    createSchema: GenerateEstimateSchema, updateSchema: UpdateEstimateSchema,
    resourceName: 'Estimate',
    description: 'Estimates provide price quotes for prospective work. Pricing is auto-calculated from service type rates and property measurements: `totalPrice = basePrice + (ratePerUnit x propertyMeasurement)`. Lifecycle: draft -> sent -> accepted -> invoiced (or rejected/expired).',
});

registry.registerPath({
    method: 'post', path: '/estimates/{estimateId}/invoice', tags: ['Estimates'], security,
    summary: 'Convert estimate to invoice',
    description: 'Convert an accepted estimate into an invoice. The estimate must be in "accepted" status. Creates a new invoice with line items copied from the estimate and marks the estimate as "invoiced".',
    parameters: [{ in: 'path', name: 'estimateId', required: true, schema: { type: 'string' } }],
    responses: { 201: { description: 'Invoice created from estimate' }, ...errorResponses },
});

// Payment Methods (top-level delete)
registry.registerPath({
    method: 'delete', path: '/payment-methods/{paymentMethodId}', tags: ['Payment Methods'], security,
    summary: 'Delete payment method',
    parameters: [{ in: 'path', name: 'paymentMethodId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Payment method deleted' }, ...errorResponses },
});

// Invoice Schedules (top-level update/delete)
registry.registerPath({
    method: 'put', path: '/invoice-schedules/{invoiceScheduleId}', tags: ['Invoice Schedules'], security,
    summary: 'Update invoice schedule',
    parameters: [{ in: 'path', name: 'invoiceScheduleId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdateInvoiceScheduleSchema) },
    responses: { 200: { description: 'Updated invoice schedule' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/invoice-schedules/{invoiceScheduleId}', tags: ['Invoice Schedules'], security,
    summary: 'Delete invoice schedule',
    parameters: [{ in: 'path', name: 'invoiceScheduleId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Invoice schedule deleted' }, ...errorResponses },
});

// ── Pay Schedules ──
registerCrud({
    tag: 'Pay Schedules', basePath: '/pay-schedules', paramName: 'payScheduleId',
    createSchema: CreatePayScheduleSchema, updateSchema: UpdatePayScheduleSchema,
    resourceName: 'Pay Schedule',
    description: 'Pay schedules define payroll cadence (weekly, biweekly, semimonthly, monthly) and the specific day of week/month for processing.',
});

// ══════════════════════════════════════════════════════════════════
//  SUBCONTRACTORS
// ══════════════════════════════════════════════════════════════════

registerCrud({
    tag: 'Subcontractors', basePath: '/subcontractors', paramName: 'subcontractorId',
    createSchema: CreateSubcontractorSchema, updateSchema: UpdateSubcontractorSchema,
    resourceName: 'Subcontractor',
    description: 'Subcontractors are external service providers who perform work on behalf of the organization. They have their own rate schedules per property and service type.',
});

// Subcontractor Rates (nested)
registry.registerPath({
    method: 'get', path: '/subcontractors/{subcontractorId}/rates', tags: ['Subcontractor Rates'], security,
    summary: 'List rates for subcontractor',
    description: 'Returns all rate agreements for a subcontractor, broken down by property and service type.',
    parameters: [
        { in: 'path', name: 'subcontractorId', required: true, schema: { type: 'string' } },
        PaginatedQueryParams.limit, PaginatedQueryParams.cursor,
    ],
    responses: { 200: { description: 'Array of subcontractor rate objects' }, ...errorResponses },
});
registry.registerPath({
    method: 'post', path: '/subcontractors/{subcontractorId}/rates', tags: ['Subcontractor Rates'], security,
    summary: 'Create rate for subcontractor',
    description: 'Set a rate for a subcontractor for a specific property and service type combination. Rate is in cents.',
    parameters: [{ in: 'path', name: 'subcontractorId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(CreateSubcontractorRateSchema) },
    responses: { 201: { description: 'Subcontractor rate created' }, ...errorResponses },
});

// Subcontractor Rates (top-level)
registry.registerPath({
    method: 'get', path: '/subcontractor-rates/{subcontractorRateId}', tags: ['Subcontractor Rates'], security,
    summary: 'Get subcontractor rate',
    parameters: [{ in: 'path', name: 'subcontractorRateId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Subcontractor rate object' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/subcontractor-rates/{subcontractorRateId}', tags: ['Subcontractor Rates'], security,
    summary: 'Update subcontractor rate',
    parameters: [{ in: 'path', name: 'subcontractorRateId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdateSubcontractorRateSchema) },
    responses: { 200: { description: 'Updated subcontractor rate' }, ...errorResponses },
});
registry.registerPath({
    method: 'delete', path: '/subcontractor-rates/{subcontractorRateId}', tags: ['Subcontractor Rates'], security,
    summary: 'Delete subcontractor rate',
    parameters: [{ in: 'path', name: 'subcontractorRateId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Subcontractor rate deleted' }, ...errorResponses },
});

// ══════════════════════════════════════════════════════════════════
//  INTEGRATIONS
// ══════════════════════════════════════════════════════════════════

registry.registerPath({
    method: 'get', path: '/integrations/stripe', tags: ['Integrations'], security,
    summary: 'Get Stripe API keys',
    description: 'Retrieve the Stripe public and secret key configuration for the current organization. Secret keys are stored in AWS Secrets Manager at `versa/org/{organizationId}/secrets`.',
    responses: { 200: { description: 'Stripe key configuration (secret key is partially masked)' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/integrations/stripe', tags: ['Integrations'], security,
    summary: 'Set Stripe API keys',
    description: 'Configure Stripe API keys for the current organization. Public key must start with `pk_` and secret key with `sk_`.',
    request: { body: jsonContent(SetStripeKeysSchema) },
    responses: { 200: { description: 'Stripe keys saved' }, ...errorResponses },
});

// ══════════════════════════════════════════════════════════════════
//  ORGANIZATIONS (SuperAdmin only)
// ══════════════════════════════════════════════════════════════════

const orgTag = 'Organizations (SuperAdmin)';
registerCrud({
    tag: orgTag, basePath: '/organizations', paramName: 'organizationId',
    createSchema: CreateOrganizationSchema, updateSchema: UpdateOrganizationSchema,
    resourceName: 'Organization',
    description: 'Organizations are the top-level tenant boundary. **SuperAdmin only.** Each organization operates independently with its own customers, employees, plans, and configuration.',
});

registry.registerPath({
    method: 'get', path: '/organizations/{organizationId}/config', tags: [orgTag], security,
    summary: 'Get organization config',
    description: 'Retrieve organization-specific configuration (branding, default plan, invoice settings, Google Maps API key).',
    parameters: [{ in: 'path', name: 'organizationId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Organization config object' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/organizations/{organizationId}/config', tags: [orgTag], security,
    summary: 'Update organization config',
    parameters: [{ in: 'path', name: 'organizationId', required: true, schema: { type: 'string' } }],
    request: { body: jsonContent(UpdateOrgConfigSchema) },
    responses: { 200: { description: 'Config updated' }, ...errorResponses },
});

registry.registerPath({
    method: 'get', path: '/organizations/{organizationId}/secrets', tags: [orgTag], security,
    summary: 'Get organization secrets',
    description: 'List all secret keys (names only, not values) stored for an organization in AWS Secrets Manager.',
    parameters: [{ in: 'path', name: 'organizationId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Secret key names' }, ...errorResponses },
});
registry.registerPath({
    method: 'put', path: '/organizations/{organizationId}/secrets/{key}', tags: [orgTag], security,
    summary: 'Set organization secret',
    description: 'Store or update a secret value for an organization. Used for third-party API keys and sensitive configuration.',
    parameters: [
        { in: 'path', name: 'organizationId', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'key', required: true, schema: { type: 'string' }, description: 'Secret key name' },
    ],
    request: { body: jsonContent(SetOrgSecretSchema) },
    responses: { 200: { description: 'Secret saved' }, ...errorResponses },
});

registry.registerPath({
    method: 'get', path: '/admin-users', tags: [orgTag], security,
    summary: 'List admin users',
    description: 'Returns all users in the SuperAdmin Cognito group.',
    responses: { 200: { description: 'Array of admin user objects' }, ...errorResponses },
});

// ══════════════════════════════════════════════════════════════════
//  GENERATE SPEC
// ══════════════════════════════════════════════════════════════════

export function generateOpenApiSpec() {
    const generator = new OpenApiGeneratorV3(registry.definitions);

    return generator.generateDocument({
        openapi: '3.0.0',
        info: {
            title: 'Versa Property Management API',
            version: '1.0.0',
            description:
                '## Overview\n\n' +
                'Versa is a **multi-tenant** property management platform that bundles home and commercial property services ' +
                '(lawn care, pest control, window cleaning, fertilizer, sprinkler maintenance, winterizing, and more) into a single subscription.\n\n' +
                'This API powers all CRUD operations for customers, properties, services, billing, workforce management, and organization administration.\n\n' +
                '## Authentication\n\n' +
                'All endpoints (except those under `/public`) require a **Bearer JWT** token from Amazon Cognito.\n\n' +
                '```\nAuthorization: Bearer <cognito-access-token>\n```\n\n' +
                '**How to obtain a token:**\n' +
                '1. Authenticate via the Cognito Hosted UI, or\n' +
                '2. Use the AWS Amplify Auth library (`Auth.signIn()` / `fetchAuthSession()`), or\n' +
                '3. Call the Cognito `InitiateAuth` API directly with `USER_PASSWORD_AUTH` flow.\n\n' +
                'The access token contains a custom `organizationId` claim injected by a Pre Token Generation Lambda trigger. ' +
                'This claim is used to scope all data access to the authenticated user\'s organization.\n\n' +
                '## Multi-Tenancy\n\n' +
                'All data is scoped by `organizationId`. You never need to pass it explicitly — it is extracted from the JWT token automatically. ' +
                'Each organization\'s data is fully isolated at the database level (DynamoDB partition key prefix).\n\n' +
                '## Cognito User Groups & Roles\n\n' +
                '| Group | Description |\n' +
                '|-------|-------------|\n' +
                '| **SuperAdmin** | Platform-wide administration, organization management |\n' +
                '| **Admin** | Full access within their organization |\n' +
                '| **Manager** | Manage customers, employees, schedules, billing |\n' +
                '| **User** | Standard staff access |\n' +
                '| **Servicer** | Field worker — view schedules and update completions |\n' +
                '| **Customer** | Customer portal — view invoices, estimates, properties |\n\n' +
                '## Monetary Values\n\n' +
                'All monetary values are stored and returned as **integers in cents** to avoid floating-point precision issues. ' +
                'For example, `$149.99` is represented as `14999`.\n\n' +
                '## Pagination\n\n' +
                'List endpoints support cursor-based pagination via `limit` and `cursor` query parameters. ' +
                'The response includes a `cursor` field — pass it as the `cursor` query parameter to fetch the next page. ' +
                'When `cursor` is `null` or absent, there are no more results.\n\n' +
                '## Error Responses\n\n' +
                'All errors follow a consistent format:\n' +
                '```json\n{\n  "error": {\n    "code": "VALIDATION_ERROR",\n    "message": "Human-readable message",\n    "details": [{"path": "field", "message": "Required"}],\n    "requestId": "abc-123"\n  }\n}\n```\n\n' +
                '## Rate Limits\n\n' +
                '- **100 requests/second** sustained rate\n' +
                '- **200 requests/second** burst\n' +
                '- **10,000 requests/day** quota\n',
        },
        servers: [
            {
                url: 'https://{apiId}.execute-api.{region}.amazonaws.com/prod',
                description: 'Production (AWS API Gateway)',
                variables: {
                    apiId: { default: 'xxxxx', description: 'API Gateway ID' },
                    region: { default: 'us-east-1', description: 'AWS Region' },
                },
            },
            {
                url: 'http://localhost:3001',
                description: 'Local Development',
            },
        ],
    });
}
