import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { PropertyTypeEntity } from '../entities/property-type';
import { ServiceTypeEntity } from '../entities/service-type';
import { CostTypeEntity } from '../entities/cost-type';
import { OrganizationEntity } from '../entities/organization';

const GLOBAL_ORG_ID = 'GLOBAL';
const DEFAULT_ORG_ID = 'versa-default';

interface SeedItem {
    entity: 'organization' | 'propertyType' | 'serviceType' | 'costType';
    data: Record<string, unknown>;
}

const SEED_ITEMS: SeedItem[] = [
    // Default Organization
    {
        entity: 'organization',
        data: {
            organizationId: DEFAULT_ORG_ID,
            name: 'Versa Property Management',
            slug: 'versa',
            status: 'active',
            ownerUserId: 'system',
            billingEmail: 'admin@versapm.com',
            timezone: 'America/Denver',
        },
    },
    // Property Types (GLOBAL)
    {
        entity: 'propertyType',
        data: { organizationId: GLOBAL_ORG_ID, propertyTypeId: 'residential', name: 'Residential', description: 'Single-family residential property' },
    },
    {
        entity: 'propertyType',
        data: { organizationId: GLOBAL_ORG_ID, propertyTypeId: 'commercial', name: 'Commercial', description: 'Commercial business property' },
    },
    // Service Types (GLOBAL)
    ...['Lawn Care', 'Pest Control', 'Fertilizer', 'Window Cleaning', 'Sprinkler', 'Winterizing', 'Snow Removal', 'Gutter Cleaning', 'Power Washing', 'Tree Trimming'].map(name => ({
        entity: 'serviceType' as const,
        data: {
            organizationId: GLOBAL_ORG_ID,
            serviceTypeId: name.toLowerCase().replace(/\s+/g, '_'),
            name,
            description: `Professional ${name.toLowerCase()} services`,
            category: name.includes('Snow') || name.includes('Winter') ? 'Seasonal' : 'Regular',
        },
    })),
    // Cost Types (GLOBAL)
    ...['One-Time', 'Recurring Monthly', 'Recurring Quarterly', 'Seasonal', 'Per-Visit'].map(name => ({
        entity: 'costType' as const,
        data: {
            organizationId: GLOBAL_ORG_ID,
            costTypeId: name.toLowerCase().replace(/[\s-]+/g, '_'),
            name,
            description: `${name} billing frequency`,
        },
    })),
];

async function seedItem(item: SeedItem): Promise<void> {
    try {
        switch (item.entity) {
            case 'organization':
                await OrganizationEntity.put(item.data as any).go();
                break;
            case 'propertyType':
                await PropertyTypeEntity.put(item.data as any).go();
                break;
            case 'serviceType':
                await ServiceTypeEntity.put(item.data as any).go();
                break;
            case 'costType':
                await CostTypeEntity.put(item.data as any).go();
                break;
        }
    } catch (err: any) {
        // ElectroDB wraps conditional check errors
        if (err.message?.includes('conditional') || err.code === 'ConditionalCheckFailedException') {
            console.log(`Item already exists, skipping: ${item.entity} ${JSON.stringify(item.data)}`);
        } else {
            throw err;
        }
    }
}

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
    console.log('Seed handler invoked', JSON.stringify(event));

    const responseUrl = event.ResponseURL;
    const responseBody: Record<string, any> = {
        Status: 'SUCCESS',
        Reason: `See CloudWatch Log Stream: ${context.logStreamName}`,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {},
    };

    try {
        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            console.log(`Seeding ${SEED_ITEMS.length} items`);

            for (const item of SEED_ITEMS) {
                await seedItem(item);
            }

            responseBody.Data = { SeededCount: SEED_ITEMS.length };
            console.log('Seeding complete.');
        }

        if (event.RequestType === 'Delete') {
            console.log('Delete request — no action needed for seed data.');
        }
    } catch (error: any) {
        console.error('Seed handler error:', error);
        responseBody.Status = 'FAILED';
        responseBody.Reason = error.message;
    }

    const response = await fetch(responseUrl, {
        method: 'PUT',
        body: JSON.stringify(responseBody),
        headers: { 'Content-Type': '' },
    });

    console.log(`CloudFormation response status: ${response.status}`);
    return;
};
