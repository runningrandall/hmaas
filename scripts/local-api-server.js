#!/usr/bin/env node

/**
 * Local API server using Fastify that wraps compiled Lambda handlers.
 * Replaces SAM CLI for local development.
 *
 * Usage:
 *   pnpm --filter backend run build   # compile handlers first
 *   node scripts/local-api-server.js   # start the server
 *
 * Or via the root script:
 *   pnpm api:local
 */

const path = require('path');
const fs = require('fs');

// Load .env from project root so the server works when run directly
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const Fastify = require('fastify');
const cors = require('@fastify/cors');

const PORT = parseInt(process.env.API_PORT || '3001', 10);
const BACKEND_DIST = path.resolve(__dirname, '..', 'backend', 'dist');
const HOT_RELOAD = process.argv.includes('--watch') || process.env.HOT_RELOAD === 'true';

/**
 * Clear require cache for all modules under backend/dist so changes from tsc --watch are picked up.
 */
function clearBackendCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(BACKEND_DIST)) {
      delete require.cache[key];
    }
  }
}

// ── Route definitions ──────────────────────────────────────────────────────
// Maps API Gateway paths ({param} style) to handler module paths (relative to backend/dist/handlers/)
// Fastify uses :param style, so we convert below.
const ROUTES = [
  // Organizations (SuperAdmin)
  ['GET',    '/organizations',                                   'organizations/list'],
  ['POST',   '/organizations',                                   'organizations/create'],
  ['GET',    '/organizations/{organizationId}',                  'organizations/get'],
  ['PUT',    '/organizations/{organizationId}',                  'organizations/update'],
  ['DELETE', '/organizations/{organizationId}',                  'organizations/delete'],
  ['GET',    '/organizations/{organizationId}/config',           'organizations/getConfig'],
  ['PUT',    '/organizations/{organizationId}/config',           'organizations/updateConfig'],
  ['GET',    '/organizations/{organizationId}/secrets',          'organizations/getSecrets'],
  ['PUT',    '/organizations/{organizationId}/secrets/{key}',    'organizations/setSecret'],

  // Admin Users
  ['GET',    '/admin-users',                                     'organizations/listAdminUsers'],

  // Property Types
  ['GET',    '/property-types',                                  'propertyTypes/list'],
  ['POST',   '/property-types',                                  'propertyTypes/create'],
  ['GET',    '/property-types/{propertyTypeId}',                 'propertyTypes/get'],
  ['PUT',    '/property-types/{propertyTypeId}',                 'propertyTypes/update'],
  ['DELETE', '/property-types/{propertyTypeId}',                 'propertyTypes/delete'],

  // Service Types
  ['GET',    '/service-types',                                   'serviceTypes/list'],
  ['POST',   '/service-types',                                   'serviceTypes/create'],
  ['GET',    '/service-types/{serviceTypeId}',                   'serviceTypes/get'],
  ['PUT',    '/service-types/{serviceTypeId}',                   'serviceTypes/update'],
  ['DELETE', '/service-types/{serviceTypeId}',                   'serviceTypes/delete'],

  // Public (unauthenticated)
  ['GET',    '/public/service-types',                              'serviceTypes/listPublic'],
  ['GET',    '/public/property-types',                             'propertyTypes/listPublic'],
  ['GET',    '/public/categories',                                 'categories/listPublic'],
  ['GET',    '/public/plans',                                      'plans/listPublic'],

  // Categories
  ['GET',    '/categories',                                        'categories/list'],
  ['POST',   '/categories',                                        'categories/create'],
  ['GET',    '/categories/{categoryId}',                           'categories/get'],
  ['PUT',    '/categories/{categoryId}',                           'categories/update'],
  ['DELETE', '/categories/{categoryId}',                           'categories/delete'],

  // Service Type Categories
  ['GET',    '/service-types/{serviceTypeId}/categories',          'serviceTypeCategories/list'],
  ['POST',   '/service-types/{serviceTypeId}/categories',          'serviceTypeCategories/create'],
  ['DELETE', '/service-types/{serviceTypeId}/categories/{categoryId}', 'serviceTypeCategories/delete'],

  // Cost Types
  ['GET',    '/cost-types',                                      'costTypes/list'],
  ['POST',   '/cost-types',                                      'costTypes/create'],
  ['GET',    '/cost-types/{costTypeId}',                         'costTypes/get'],
  ['PUT',    '/cost-types/{costTypeId}',                         'costTypes/update'],
  ['DELETE', '/cost-types/{costTypeId}',                         'costTypes/delete'],

  // Customers
  ['GET',    '/customers',                                       'customers/list'],
  ['POST',   '/customers',                                       'customers/create'],
  ['GET',    '/customers/{customerId}',                          'customers/get'],
  ['PUT',    '/customers/{customerId}',                          'customers/update'],
  ['DELETE', '/customers/{customerId}',                          'customers/delete'],
  ['GET',    '/customers/{customerId}/account',                  'customers/getAccount'],
  ['GET',    '/customers/{customerId}/properties',               'properties/listByCustomer'],
  ['POST',   '/customers/{customerId}/properties',               'properties/create'],
  ['GET',    '/customers/{customerId}/payment-methods',          'paymentMethods/list'],
  ['POST',   '/customers/{customerId}/payment-methods',          'paymentMethods/create'],
  ['GET',    '/customers/{customerId}/invoice-schedules',        'invoiceSchedules/list'],
  ['POST',   '/customers/{customerId}/invoice-schedules',        'invoiceSchedules/create'],

  // Delegates
  ['GET',    '/accounts/{accountId}/delegates',                  'delegates/list'],
  ['POST',   '/accounts/{accountId}/delegates',                  'delegates/create'],
  ['DELETE', '/delegates/{delegateId}',                          'delegates/delete'],

  // Properties
  ['GET',    '/properties/{propertyId}',                         'properties/get'],
  ['PUT',    '/properties/{propertyId}',                         'properties/update'],
  ['DELETE', '/properties/{propertyId}',                         'properties/delete'],

  // Property Services
  ['GET',    '/properties/{propertyId}/services',                'propertyServices/listByProperty'],
  ['POST',   '/properties/{propertyId}/services',                'propertyServices/create'],
  ['GET',    '/property-services/{serviceId}',                   'propertyServices/get'],
  ['PUT',    '/property-services/{serviceId}',                   'propertyServices/update'],
  ['DELETE', '/property-services/{serviceId}',                   'propertyServices/delete'],

  // Costs
  ['GET',    '/property-services/{serviceId}/costs',             'costs/listByService'],
  ['POST',   '/property-services/{serviceId}/costs',             'costs/create'],
  ['DELETE', '/costs/{costId}',                                  'costs/delete'],

  // Plans
  ['GET',    '/plans',                                           'plans/list'],
  ['POST',   '/plans',                                           'plans/create'],
  ['GET',    '/plans/{planId}',                                  'plans/get'],
  ['PUT',    '/plans/{planId}',                                  'plans/update'],
  ['DELETE', '/plans/{planId}',                                  'plans/delete'],

  // Plan Services
  // Plan Categories
  ['GET',    '/plans/{planId}/categories',                       'planCategories/list'],
  ['POST',   '/plans/{planId}/categories',                       'planCategories/create'],
  ['DELETE', '/plans/{planId}/categories/{categoryId}',          'planCategories/delete'],

  ['GET',    '/plans/{planId}/services',                         'planServices/list'],
  ['POST',   '/plans/{planId}/services',                         'planServices/create'],
  ['DELETE', '/plans/{planId}/services/{serviceTypeId}',         'planServices/delete'],

  // Employees
  ['GET',    '/employees',                                       'employees/list'],
  ['POST',   '/employees',                                       'employees/create'],
  ['GET',    '/employees/{employeeId}',                          'employees/get'],
  ['PUT',    '/employees/{employeeId}',                          'employees/update'],
  ['DELETE', '/employees/{employeeId}',                          'employees/delete'],

  // Servicers
  ['POST',   '/employees/{employeeId}/servicer',                 'servicers/create'],
  ['GET',    '/servicers/{servicerId}',                          'servicers/get'],
  ['PUT',    '/servicers/{servicerId}',                          'servicers/update'],

  // Capabilities
  ['GET',    '/employees/{employeeId}/capabilities',             'capabilities/list'],
  ['POST',   '/employees/{employeeId}/capabilities',             'capabilities/create'],
  ['DELETE', '/capabilities/{capabilityId}',                     'capabilities/delete'],

  // Service Schedules
  ['GET',    '/service-schedules',                               'serviceSchedules/list'],
  ['POST',   '/service-schedules',                               'serviceSchedules/create'],
  ['GET',    '/service-schedules/{serviceScheduleId}',           'serviceSchedules/get'],
  ['PUT',    '/service-schedules/{serviceScheduleId}',           'serviceSchedules/update'],

  // Invoices
  ['GET',    '/invoices',                                        'invoices/list'],
  ['POST',   '/invoices',                                        'invoices/create'],
  ['GET',    '/invoices/{invoiceId}',                            'invoices/get'],
  ['PUT',    '/invoices/{invoiceId}',                            'invoices/update'],

  // Estimates
  ['GET',    '/estimates',                                       'estimates/list'],
  ['POST',   '/estimates',                                       'estimates/create'],
  ['GET',    '/estimates/{estimateId}',                          'estimates/get'],
  ['PUT',    '/estimates/{estimateId}',                          'estimates/update'],
  ['DELETE', '/estimates/{estimateId}',                          'estimates/delete'],
  ['POST',   '/estimates/{estimateId}/invoice',                  'estimates/convertToInvoice'],

  // Payment Methods
  ['DELETE', '/payment-methods/{paymentMethodId}',               'paymentMethods/delete'],

  // Invoice Schedules
  ['PUT',    '/invoice-schedules/{invoiceScheduleId}',           'invoiceSchedules/update'],
  ['DELETE', '/invoice-schedules/{invoiceScheduleId}',           'invoiceSchedules/delete'],

  // Pay
  ['GET',    '/employees/{employeeId}/pay',                      'pay/list'],
  ['POST',   '/employees/{employeeId}/pay',                      'pay/create'],
  ['PUT',    '/pay/{payId}',                                     'pay/update'],
  ['DELETE', '/pay/{payId}',                                     'pay/delete'],

  // Pay Schedules
  ['GET',    '/pay-schedules',                                   'paySchedules/list'],
  ['POST',   '/pay-schedules',                                   'paySchedules/create'],
  ['GET',    '/pay-schedules/{payScheduleId}',                   'paySchedules/get'],
  ['PUT',    '/pay-schedules/{payScheduleId}',                   'paySchedules/update'],
  ['DELETE', '/pay-schedules/{payScheduleId}',                   'paySchedules/delete'],
];

/**
 * Convert API Gateway path params {param} to Fastify :param style.
 */
function toFastifyPath(apiGwPath) {
  return apiGwPath.replace(/\{(\w+)\}/g, ':$1');
}

/**
 * Convert Fastify :param path params back to API Gateway {param} style
 * for the resource path in the event.
 */
function toApiGwPath(fastifyPath) {
  return fastifyPath.replace(/:(\w+)/g, '{$1}');
}

/**
 * Build a minimal APIGatewayProxyEvent from a Fastify request.
 */
function buildEvent(request, apiGwPath) {
  const orgId = request.headers['x-organization-id'] || 'versa-default';
  const body = request.body != null ? JSON.stringify(request.body) : null;

  return {
    httpMethod: request.method,
    path: request.url.split('?')[0],
    resource: apiGwPath,
    pathParameters: request.params && Object.keys(request.params).length > 0
      ? request.params
      : null,
    queryStringParameters: request.query && Object.keys(request.query).length > 0
      ? request.query
      : null,
    multiValueQueryStringParameters: null,
    headers: { 'content-type': 'application/json', ...request.headers },
    multiValueHeaders: {},
    body,
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      authorizer: {
        organizationId: orgId,
        claims: {
          sub: 'local-dev-user',
          'cognito:groups': 'SuperAdmin',
        },
      },
      httpMethod: request.method,
      identity: { sourceIp: '127.0.0.1' },
      path: request.url.split('?')[0],
      protocol: 'HTTP/1.1',
      requestId: `local-${Date.now()}`,
      requestTimeEpoch: Date.now(),
      resourceId: 'local',
      resourcePath: apiGwPath,
      stage: 'local',
    },
  };
}

/**
 * Minimal Lambda context object.
 */
function buildContext() {
  return {
    functionName: 'local-api',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:000000000000:function:local-api',
    memoryLimitInMB: '256',
    awsRequestId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    logGroupName: '/aws/lambda/local-api',
    logStreamName: 'local',
    getRemainingTimeInMillis: () => 30000,
    callbackWaitsForEmptyEventLoop: true,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

async function main() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });

  // Disable Fastify's built-in body parser so we get the raw body to stringify for Lambda
  fastify.removeAllContentTypeParsers();
  const bodyParser = (req, body, done) => {
    try {
      done(null, body ? JSON.parse(body) : undefined);
    } catch {
      done(null, body);
    }
  };
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, bodyParser);
  fastify.addContentTypeParser('*', { parseAs: 'string' }, bodyParser);

  let registered = 0;
  let skipped = 0;

  for (const [method, apiGwPath, handlerPath] of ROUTES) {
    const modulePath = path.join(BACKEND_DIST, 'handlers', handlerPath);

    // In non-watch mode, verify the handler exists at startup
    if (!HOT_RELOAD) {
      let mod;
      try {
        mod = require(modulePath);
      } catch (err) {
        skipped++;
        fastify.log.warn(`Skipping ${method} ${apiGwPath} — handler not found at ${modulePath}: ${err.message}`);
        continue;
      }
      if (typeof mod.handler !== 'function') {
        skipped++;
        fastify.log.warn(`Skipping ${method} ${apiGwPath} — no handler export in ${modulePath}`);
        continue;
      }
    }

    const fastifyPath = toFastifyPath(apiGwPath);

    fastify.route({
      method,
      url: fastifyPath,
      handler: async (request, reply) => {
        // In watch mode, clear the cache so we pick up rebuilt files
        if (HOT_RELOAD) {
          clearBackendCache();
        }

        let handler;
        try {
          handler = require(modulePath).handler;
        } catch (err) {
          request.log.error(err, `Failed to load handler for ${method} ${apiGwPath}`);
          return reply.code(500).send({ message: 'Handler module not found', error: err.message });
        }

        const event = buildEvent(request, apiGwPath);
        const context = buildContext();

        try {
          const result = await handler(event, context);
          reply.code(result.statusCode || 200);

          if (result.headers) {
            for (const [key, value] of Object.entries(result.headers)) {
              // Skip CORS headers — @fastify/cors handles them
              if (key.toLowerCase().startsWith('access-control-')) continue;
              reply.header(key, value);
            }
          }

          // If body looks like JSON, parse it so Fastify sets the right content-type
          if (result.body) {
            try {
              return reply.send(JSON.parse(result.body));
            } catch {
              return reply.send(result.body);
            }
          }
          return reply.send();
        } catch (err) {
          request.log.error(err, `Handler error for ${method} ${apiGwPath}`);
          return reply.code(500).send({
            message: 'Internal server error',
            error: err.message,
          });
        }
      },
    });
    registered++;
  }

  // Health check endpoint
  fastify.get('/health', async () => ({ status: 'ok', routes: registered, skipped }));

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n  Local API server ready${HOT_RELOAD ? ' (hot-reload enabled)' : ''}`);
    console.log(`  ${registered} routes registered, ${skipped} skipped`);
    console.log(`  http://localhost:${PORT}\n`);
    console.log(`  Health check: http://localhost:${PORT}/health`);
    if (HOT_RELOAD) {
      console.log(`  Hot-reload: handler changes picked up automatically (run tsc --watch)`);
    }
    console.log(`  Tip: pass x-organization-id header (default: versa-default)\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
