import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

import { handler } from '../../src/handlers/migrateMultiTenancy';

function makeItem(entityName: string, attrs: Record<string, any>, pk: string, sk: string) {
    return {
        pk,
        sk,
        __edb_e__: entityName,
        __edb_v__: '1',
        ...attrs,
    };
}

describe('migrateMultiTenancy handler', () => {
    beforeEach(() => {
        ddbMock.reset();
        vi.clearAllMocks();
    });

    it('should migrate a propertyType item with GLOBAL orgId', async () => {
        const item = makeItem('propertyType', {
            propertyTypeId: 'residential',
            name: 'Residential',
            description: 'Single-family residential property',
            createdAt: 1700000000000,
        }, '$versa#propertytypeid_residential', '$propertyType_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });
        ddbMock.on(TransactWriteCommand).resolves({});

        const result = await handler();

        expect(result.scanned).toBe(1);
        expect(result.migrated).toBe(1);
        expect(result.skipped).toBe(0);
        expect(result.errors).toHaveLength(0);

        // Verify TransactWrite was called
        const txCall = ddbMock.commandCalls(TransactWriteCommand);
        expect(txCall).toHaveLength(1);
        const txItems = txCall[0].args[0].input.TransactItems!;
        expect(txItems).toHaveLength(2);

        // Verify the Put item has GLOBAL orgId and new pk format
        const putItem = txItems[0].Put!.Item!;
        expect(putItem.organizationId).toBe('GLOBAL');
        expect(putItem.pk).toContain('organizationid_GLOBAL');
        expect(putItem.pk).toContain('propertytypeid_residential');

        // Verify the Delete has the old key
        const deleteKey = txItems[1].Delete!.Key!;
        expect(deleteKey.pk).toBe('$versa#propertytypeid_residential');
    });

    it('should migrate a customer item with versa-default orgId', async () => {
        const item = makeItem('customer', {
            customerId: 'cust-123',
            firstName: 'John',
            lastName: 'Doe',
            status: 'active',
        }, '$versa#customerid_cust-123', '$customer_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });
        ddbMock.on(TransactWriteCommand).resolves({});

        const result = await handler();

        expect(result.migrated).toBe(1);

        const txItems = ddbMock.commandCalls(TransactWriteCommand)[0].args[0].input.TransactItems!;
        const putItem = txItems[0].Put!.Item!;
        expect(putItem.organizationId).toBe('versa-default');
        expect(putItem.pk).toContain('organizationid_versa-default');
    });

    it('should skip items that already have organizationId', async () => {
        const item = makeItem('customer', {
            customerId: 'cust-123',
            organizationId: 'org-existing',
        }, '$versa#organizationid_org-existing#customerid_cust-123', '$customer_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });

        const result = await handler();

        expect(result.scanned).toBe(1);
        expect(result.migrated).toBe(0);
        expect(result.skipped).toBe(1);
        expect(ddbMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
    });

    it('should skip items without __edb_e__ metadata', async () => {
        const item = { pk: 'some-pk', sk: 'some-sk', data: 'value' };

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });

        const result = await handler();

        expect(result.skipped).toBe(1);
        expect(result.migrated).toBe(0);
    });

    it('should skip unknown entity types', async () => {
        const item = makeItem('unknownEntity', {
            someId: 'id-123',
        }, '$versa#someid_id-123', '$unknownEntity_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });

        const result = await handler();

        expect(result.skipped).toBe(1);
        expect(result.migrated).toBe(0);
    });

    it('should handle pagination across multiple scan pages', async () => {
        const item1 = makeItem('propertyType', {
            propertyTypeId: 'residential',
            name: 'Residential',
        }, '$versa#propertytypeid_residential', '$propertyType_1');

        const item2 = makeItem('serviceType', {
            serviceTypeId: 'lawn_care',
            name: 'Lawn Care',
        }, '$versa#servicetypeid_lawn_care', '$serviceType_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({
                Items: [item1],
                LastEvaluatedKey: { pk: 'cursor', sk: 'cursor' },
            })
            .resolvesOnce({
                Items: [item2],
                LastEvaluatedKey: undefined,
            });
        ddbMock.on(TransactWriteCommand).resolves({});

        const result = await handler();

        expect(result.scanned).toBe(2);
        expect(result.migrated).toBe(2);
        expect(ddbMock.commandCalls(TransactWriteCommand)).toHaveLength(2);
    });

    it('should record errors for failed transactions without stopping', async () => {
        const item1 = makeItem('propertyType', {
            propertyTypeId: 'residential',
            name: 'Residential',
        }, '$versa#propertytypeid_residential', '$propertyType_1');

        const item2 = makeItem('serviceType', {
            serviceTypeId: 'lawn_care',
            name: 'Lawn Care',
        }, '$versa#servicetypeid_lawn_care', '$serviceType_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item1, item2], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });
        ddbMock.on(TransactWriteCommand)
            .rejectsOnce(new Error('Transaction conflict'))
            .resolves({});

        const result = await handler();

        expect(result.scanned).toBe(2);
        expect(result.migrated).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Transaction conflict');
    });

    it('should handle empty table', async () => {
        ddbMock.on(ScanCommand).resolves({ Items: [], LastEvaluatedKey: undefined });

        const result = await handler();

        expect(result.scanned).toBe(0);
        expect(result.migrated).toBe(0);
        expect(result.skipped).toBe(0);
        expect(result.errors).toHaveLength(0);
    });

    it('should migrate a planService item with compound SK', async () => {
        const item = makeItem('planService', {
            planId: 'plan-1',
            serviceTypeId: 'lawn_care',
            includedVisits: 12,
        }, '$versa#planid_plan-1', '$planService_1#servicetypeid_lawn_care');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });
        ddbMock.on(TransactWriteCommand).resolves({});

        const result = await handler();

        expect(result.migrated).toBe(1);

        const txItems = ddbMock.commandCalls(TransactWriteCommand)[0].args[0].input.TransactItems!;
        const putItem = txItems[0].Put!.Item!;
        expect(putItem.organizationId).toBe('versa-default');
        expect(putItem.pk).toContain('organizationid_versa-default');
        expect(putItem.pk).toContain('planid_plan-1');
        // SK should include serviceTypeId
        expect(putItem.sk).toContain('servicetypeid_lawn_care');
    });

    it('should set GSI2 keys on migrated items', async () => {
        const item = makeItem('customer', {
            customerId: 'cust-123',
            status: 'active',
        }, '$versa#customerid_cust-123', '$customer_1');

        ddbMock.on(ScanCommand)
            .resolvesOnce({ Items: [item], LastEvaluatedKey: undefined })
            .resolves({ Items: [] });
        ddbMock.on(TransactWriteCommand).resolves({});

        await handler();

        const txItems = ddbMock.commandCalls(TransactWriteCommand)[0].args[0].input.TransactItems!;
        const putItem = txItems[0].Put!.Item!;

        // GSI2 should have org-scoped SK
        expect(putItem.gsi2pk).toBe('$versa');
        expect(putItem.gsi2sk).toContain('organizationid_versa-default');
        expect(putItem.gsi2sk).toContain('customerid_cust-123');
    });
});
