import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planServicesApi } from '../../../lib/api/plan-services';
import * as client from '../../../lib/api/client';

vi.mock('../../../lib/api/client', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiDelete: vi.fn(),
}));

describe('planServicesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should list plan services', async () => {
        const mockResult = { items: [{ planId: 'plan-1', serviceTypeId: 'st-1', includedVisits: 12 }] };
        vi.mocked(client.apiGet).mockResolvedValue(mockResult);

        const result = await planServicesApi.list('plan-1');

        expect(client.apiGet).toHaveBeenCalledWith('plans/plan-1/services');
        expect(result).toEqual(mockResult);
    });

    it('should create a plan service', async () => {
        const mockPs = { planId: 'plan-1', serviceTypeId: 'st-1', includedVisits: 12, frequency: 'monthly' };
        vi.mocked(client.apiPost).mockResolvedValue(mockPs);

        const result = await planServicesApi.create('plan-1', { serviceTypeId: 'st-1', includedVisits: 12, frequency: 'monthly' });

        expect(client.apiPost).toHaveBeenCalledWith('plans/plan-1/services', { serviceTypeId: 'st-1', includedVisits: 12, frequency: 'monthly' });
        expect(result).toEqual(mockPs);
    });

    it('should delete a plan service', async () => {
        vi.mocked(client.apiDelete).mockResolvedValue(undefined);

        await planServicesApi.delete('plan-1', 'st-1');

        expect(client.apiDelete).toHaveBeenCalledWith('plans/plan-1/services/st-1');
    });
});
