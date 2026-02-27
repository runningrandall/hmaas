import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const TARGET_ORG_ID = process.env.TARGET_ORG_ID || 'versa-default';

/**
 * Entity metadata used to reconstruct ElectroDB-format keys with organizationId.
 *
 * Old format (pre-multi-tenancy):
 *   pk: $versa#entityid_<id>           sk: $entity_1
 *
 * New format (with organizationId):
 *   pk: $versa#organizationid_<orgId>#entityid_<id>  sk: $entity_1
 */
interface EntityMigrationConfig {
    entityName: string;
    pkAttributes: string[];
    skAttributes: string[];
    gsi1PkAttributes?: string[];
    gsi1SkAttributes?: string[];
    gsi2SkAttributes?: string[];
}

const ENTITY_CONFIGS: EntityMigrationConfig[] = [
    // Lookup entities
    { entityName: 'propertyType', pkAttributes: ['propertyTypeId'], skAttributes: [], gsi2SkAttributes: ['propertyTypeId'] },
    { entityName: 'serviceType', pkAttributes: ['serviceTypeId'], skAttributes: [], gsi2SkAttributes: ['serviceTypeId'] },
    { entityName: 'costType', pkAttributes: ['costTypeId'], skAttributes: [], gsi2SkAttributes: ['costTypeId'] },
    // Core entities
    { entityName: 'customer', pkAttributes: ['customerId'], skAttributes: [], gsi1PkAttributes: ['status'], gsi1SkAttributes: ['customerId'], gsi2SkAttributes: ['customerId'] },
    { entityName: 'account', pkAttributes: ['accountId'], skAttributes: [], gsi1PkAttributes: ['customerId'], gsi1SkAttributes: ['accountId'], gsi2SkAttributes: ['accountId'] },
    { entityName: 'delegate', pkAttributes: ['delegateId'], skAttributes: [], gsi1PkAttributes: ['accountId'], gsi1SkAttributes: ['delegateId'], gsi2SkAttributes: ['delegateId'] },
    { entityName: 'property', pkAttributes: ['propertyId'], skAttributes: [], gsi1PkAttributes: ['customerId'], gsi1SkAttributes: ['propertyId'], gsi2SkAttributes: ['propertyId'] },
    // Plan entities
    { entityName: 'plan', pkAttributes: ['planId'], skAttributes: [], gsi1PkAttributes: [], gsi1SkAttributes: ['planId'], gsi2SkAttributes: ['planId'] },
    { entityName: 'planService', pkAttributes: ['planId'], skAttributes: ['serviceTypeId'], gsi2SkAttributes: ['planId'] },
    // Property service entities
    { entityName: 'propertyService', pkAttributes: ['serviceId'], skAttributes: [], gsi1PkAttributes: ['propertyId'], gsi1SkAttributes: ['serviceId'], gsi2SkAttributes: ['serviceId'] },
    { entityName: 'cost', pkAttributes: ['costId'], skAttributes: [], gsi1PkAttributes: ['serviceId'], gsi1SkAttributes: ['costId'], gsi2SkAttributes: ['costId'] },
    // Employee entities
    { entityName: 'employee', pkAttributes: ['employeeId'], skAttributes: [], gsi1PkAttributes: ['status'], gsi1SkAttributes: ['employeeId'], gsi2SkAttributes: ['employeeId'] },
    { entityName: 'servicer', pkAttributes: ['servicerId'], skAttributes: [], gsi1PkAttributes: ['employeeId'], gsi1SkAttributes: ['servicerId'], gsi2SkAttributes: ['servicerId'] },
    { entityName: 'capability', pkAttributes: ['capabilityId'], skAttributes: [], gsi1PkAttributes: ['employeeId'], gsi1SkAttributes: ['capabilityId'], gsi2SkAttributes: ['capabilityId'] },
    { entityName: 'serviceSchedule', pkAttributes: ['serviceScheduleId'], skAttributes: [], gsi1PkAttributes: ['servicerId'], gsi1SkAttributes: ['scheduledDate'], gsi2SkAttributes: ['serviceScheduleId'] },
    // Billing entities
    { entityName: 'invoice', pkAttributes: ['invoiceId'], skAttributes: [], gsi1PkAttributes: ['customerId'], gsi1SkAttributes: ['invoiceDate'], gsi2SkAttributes: ['invoiceId'] },
    { entityName: 'paymentMethod', pkAttributes: ['paymentMethodId'], skAttributes: [], gsi1PkAttributes: ['customerId'], gsi1SkAttributes: ['paymentMethodId'], gsi2SkAttributes: ['paymentMethodId'] },
    { entityName: 'invoiceSchedule', pkAttributes: ['invoiceScheduleId'], skAttributes: [], gsi1PkAttributes: ['customerId'], gsi1SkAttributes: ['invoiceScheduleId'], gsi2SkAttributes: ['invoiceScheduleId'] },
    // Payroll entities
    { entityName: 'pay', pkAttributes: ['payId'], skAttributes: [], gsi1PkAttributes: ['employeeId'], gsi1SkAttributes: ['payId'], gsi2SkAttributes: ['payId'] },
    { entityName: 'paySchedule', pkAttributes: ['payScheduleId'], skAttributes: [], gsi1PkAttributes: [], gsi1SkAttributes: ['payScheduleId'], gsi2SkAttributes: ['payScheduleId'] },
];

const ENTITY_CONFIG_MAP = new Map(ENTITY_CONFIGS.map(c => [c.entityName, c]));

function buildComposite(attrs: string[], item: Record<string, any>, prefix: string): string {
    const parts = attrs.map(attr => `${attr.toLowerCase()}_${item[attr] || ''}`);
    return parts.length > 0 ? `${prefix}#${parts.join('#')}` : prefix;
}

function buildNewPk(config: EntityMigrationConfig, item: Record<string, any>, orgId: string): string {
    const orgPart = `organizationid_${orgId}`;
    const attrParts = config.pkAttributes.map(attr => `${attr.toLowerCase()}_${item[attr] || ''}`);
    return `$versa#${orgPart}#${attrParts.join('#')}`;
}

function buildNewSk(config: EntityMigrationConfig, item: Record<string, any>): string {
    const base = `$${config.entityName}_1`;
    if (config.skAttributes.length === 0) return base;
    const parts = config.skAttributes.map(attr => `${attr.toLowerCase()}_${item[attr] || ''}`);
    return `${base}#${parts.join('#')}`;
}

function buildNewGsi1(config: EntityMigrationConfig, item: Record<string, any>, orgId: string): { gsi1pk?: string; gsi1sk?: string } {
    if (!config.gsi1PkAttributes) return {};
    const gsi1pk = buildComposite(['organizationId', ...config.gsi1PkAttributes], { organizationId: orgId, ...item }, '$versa');
    const gsi1sk = buildComposite(config.gsi1SkAttributes || [], item, `$${config.entityName}_1`);
    return { gsi1pk, gsi1sk };
}

function buildNewGsi2(config: EntityMigrationConfig, item: Record<string, any>, orgId: string): { gsi2pk: string; gsi2sk: string } {
    const gsi2pk = '$versa';
    const gsi2sk = buildComposite(['organizationId', ...(config.gsi2SkAttributes || [])], { organizationId: orgId, ...item }, `$${config.entityName}_1`);
    return { gsi2pk, gsi2sk };
}

interface MigrationResult {
    scanned: number;
    migrated: number;
    skipped: number;
    errors: string[];
}

export const handler = async (): Promise<MigrationResult> => {
    console.log('Migration started', { targetOrgId: TARGET_ORG_ID, table: TABLE_NAME });

    const result: MigrationResult = { scanned: 0, migrated: 0, skipped: 0, errors: [] };
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
        const scanResponse = await dynamodb.send(new ScanCommand({
            TableName: TABLE_NAME,
            ExclusiveStartKey: lastEvaluatedKey,
        }));

        const items = scanResponse.Items || [];
        result.scanned += items.length;

        for (const item of items) {
            const entityName = item.__edb_e__ as string;

            if (!entityName) {
                result.skipped++;
                continue;
            }

            // Skip items that already have organizationId (already migrated)
            if (item.organizationId) {
                result.skipped++;
                continue;
            }

            const config = ENTITY_CONFIG_MAP.get(entityName);
            if (!config) {
                console.log(`Unknown entity type: ${entityName}, skipping`);
                result.skipped++;
                continue;
            }

            // Determine org ID: lookup entities get GLOBAL, everything else gets TARGET_ORG_ID
            const orgId = ['propertyType', 'serviceType', 'costType'].includes(entityName) ? 'GLOBAL' : TARGET_ORG_ID;
            const oldPk = item.pk as string;
            const oldSk = item.sk as string;

            try {
                const newPk = buildNewPk(config, item, orgId);
                const newSk = buildNewSk(config, item);
                const gsi1 = buildNewGsi1(config, item, orgId);
                const gsi2 = buildNewGsi2(config, item, orgId);

                // Build the new item with updated keys and organizationId
                const newItem: Record<string, any> = {
                    ...item,
                    pk: newPk,
                    sk: newSk,
                    organizationId: orgId,
                    ...gsi2,
                };

                if (gsi1.gsi1pk) {
                    newItem.gsi1pk = gsi1.gsi1pk;
                    newItem.gsi1sk = gsi1.gsi1sk;
                }

                // Transact: put new item + delete old item
                await dynamodb.send(new TransactWriteCommand({
                    TransactItems: [
                        {
                            Put: {
                                TableName: TABLE_NAME,
                                Item: newItem,
                            },
                        },
                        {
                            Delete: {
                                TableName: TABLE_NAME,
                                Key: { pk: oldPk, sk: oldSk },
                            },
                        },
                    ],
                }));

                result.migrated++;
            } catch (err: any) {
                const errorMsg = `Failed to migrate ${entityName} (pk: ${oldPk}): ${err.message}`;
                console.error(errorMsg);
                result.errors.push(errorMsg);
            }
        }

        lastEvaluatedKey = scanResponse.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log('Migration complete', result);
    return result;
};
