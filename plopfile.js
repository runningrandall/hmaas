export default function (plop) {
    // ─── Entity Generator (Full Hexagonal Stack) ───
    plop.setGenerator('entity', {
        description: 'Scaffold a new entity with full hexagonal architecture (domain, entity, adapter, service, handlers, tests)',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Entity name (singular, e.g. order, user, comment):',
                validate: (input) => input ? true : 'Entity name is required',
            },
        ],
        actions: [
            // ── Domain Layer ──
            {
                type: 'add',
                path: 'backend/src/domain/{{camelCase name}}.ts',
                templateFile: 'templates/entity/domain.ts.hbs',
            },
            // ── ElectroDB Entity ──
            {
                type: 'add',
                path: 'backend/src/entities/{{camelCase name}}.ts',
                templateFile: 'templates/entity/entity.ts.hbs',
            },
            // ── Zod Schema ──
            {
                type: 'add',
                path: 'backend/src/lib/{{camelCase name}}-schemas.ts',
                templateFile: 'templates/entity/schema.ts.hbs',
            },
            // ── Adapter (Repository) ──
            {
                type: 'add',
                path: 'backend/src/adapters/dynamo-{{dashCase name}}-repository.ts',
                templateFile: 'templates/entity/repository.ts.hbs',
            },
            // ── Application Service ──
            {
                type: 'add',
                path: 'backend/src/application/{{dashCase name}}-service.ts',
                templateFile: 'templates/entity/service.ts.hbs',
            },
            // ── Handlers ──
            {
                type: 'add',
                path: 'backend/src/handlers/create{{pascalCase name}}.ts',
                templateFile: 'templates/entity/handlers/create.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/src/handlers/get{{pascalCase name}}.ts',
                templateFile: 'templates/entity/handlers/get.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/src/handlers/list{{pascalCase name}}s.ts',
                templateFile: 'templates/entity/handlers/list.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/src/handlers/delete{{pascalCase name}}.ts',
                templateFile: 'templates/entity/handlers/delete.ts.hbs',
            },
            // ── Tests ──
            {
                type: 'add',
                path: 'backend/test/handlers/create{{pascalCase name}}.test.ts',
                templateFile: 'templates/entity/tests/create.test.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/test/handlers/get{{pascalCase name}}.test.ts',
                templateFile: 'templates/entity/tests/get.test.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/test/handlers/list{{pascalCase name}}s.test.ts',
                templateFile: 'templates/entity/tests/list.test.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/test/handlers/delete{{pascalCase name}}.test.ts',
                templateFile: 'templates/entity/tests/delete.test.ts.hbs',
            },
            // ── Post-Generation Reminders ──
            '✅ Entity scaffolded! You still need to:',
            '   1. Register the entity in backend/src/entities/service.ts (DBService)',
            '   2. Add Lambda functions + permissions to infra/lib/infra-stack.ts',
            '   3. Add API Gateway routes in infra-stack.ts',
            '   4. Add the Zod schema export to backend/src/lib/schemas.ts (or use the new file)',
        ],
    });

    // ─── Endpoint Generator ───
    plop.setGenerator('endpoint', {
        description: 'Create a new API endpoint (handler + test)',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Endpoint name (e.g. getUser, createOrder):',
            },
            {
                type: 'list',
                name: 'method',
                message: 'HTTP method:',
                choices: ['GET', 'POST', 'PUT', 'DELETE'],
            },
        ],
        actions: [
            {
                type: 'add',
                path: 'backend/src/handlers/{{camelCase name}}.ts',
                templateFile: 'templates/endpoint/handler.ts.hbs',
            },
            {
                type: 'add',
                path: 'backend/test/handlers/{{camelCase name}}.test.ts',
                templateFile: 'templates/endpoint/handler.test.ts.hbs',
            },
            '✅ Handler and test created! Remember to:',
            '   1. Add Lambda function to infra/lib/infra-stack.ts',
            '   2. Add API Gateway route in infra-stack.ts',
            '   3. Register in OpenAPI registry if applicable',
        ],
    });

    // ─── Component Generator ───
    plop.setGenerator('component', {
        description: 'Create a new React component with Storybook story',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Component name (PascalCase, e.g. UserCard):',
            },
        ],
        actions: [
            {
                type: 'add',
                path: 'frontend/components/{{pascalCase name}}/{{pascalCase name}}.tsx',
                templateFile: 'templates/component/component.tsx.hbs',
            },
            {
                type: 'add',
                path: 'frontend/components/{{pascalCase name}}/index.ts',
                templateFile: 'templates/component/index.ts.hbs',
            },
            {
                type: 'add',
                path: 'frontend/stories/{{pascalCase name}}.stories.tsx',
                templateFile: 'templates/component/story.tsx.hbs',
            },
        ],
    });
}

