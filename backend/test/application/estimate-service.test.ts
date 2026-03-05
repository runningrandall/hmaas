import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { EstimateService } from '../../src/application/estimate-service';
import { AppError } from '../../src/lib/error';

const mockEstimateRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByCustomerId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPropertyRepo = {
    get: vi.fn(),
    create: vi.fn(),
    listByCustomerId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockServiceTypeRepo = {
    get: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPlanServiceRepo = {
    listByPlanId: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
};

const mockInvoiceRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByCustomerId: vi.fn(),
    update: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

const mockProperty = {
    organizationId: ORG_ID,
    propertyId: 'prop-1',
    customerId: 'cust-1',
    propertyTypeId: 'pt-1',
    name: 'Main House',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    status: 'active',
    measurements: { lawnSqft: 5000, gutterLinearFeet: 150 },
    createdAt: '2024-01-01T00:00:00.000Z',
};

const mockServiceType = {
    organizationId: ORG_ID,
    serviceTypeId: 'st-1',
    name: 'Lawn Mowing',
    basePrice: 2000,
    unit: 'per_sqft',
    estimatedDuration: 30,
    measurementKey: 'lawnSqft',
    measurementUnit: 'sq ft',
    ratePerUnit: 5,
    durationPerUnit: 0.5,
    createdAt: '2024-01-01T00:00:00.000Z',
};

const mockFlatServiceType = {
    organizationId: ORG_ID,
    serviceTypeId: 'st-2',
    name: 'Window Cleaning',
    basePrice: 7500,
    unit: 'per_visit',
    estimatedDuration: 45,
    createdAt: '2024-01-01T00:00:00.000Z',
};

describe('EstimateService', () => {
    let service: EstimateService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new EstimateService(
            mockEstimateRepo as any,
            mockPropertyRepo as any,
            mockServiceTypeRepo as any,
            mockPlanServiceRepo as any,
            mockInvoiceRepo as any,
            mockPublisher as any
        );
    });

    describe('generateEstimate', () => {
        it('should generate estimate with measurement-based pricing', async () => {
            mockPropertyRepo.get.mockResolvedValue(mockProperty);
            mockServiceTypeRepo.get.mockResolvedValue(mockServiceType);
            mockEstimateRepo.create.mockImplementation(async (e: any) => e);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.generateEstimate(ORG_ID, {
                customerId: 'cust-1',
                propertyId: 'prop-1',
                serviceTypeIds: ['st-1'],
            });

            // basePrice (2000) + ratePerUnit (5) * measurement (5000) = 27000
            expect(result.lineItems).toHaveLength(1);
            expect(result.lineItems[0].total).toBe(27000);
            expect(result.lineItems[0].quantity).toBe(5000);
            expect(result.lineItems[0].unit).toBe('sq ft');
            expect(result.lineItems[0].estimatedDuration).toBe(2530); // 30 + 0.5 * 5000
            expect(result.subtotal).toBe(27000);
            expect(result.total).toBe(27000);
            expect(result.status).toBe('draft');
            expect(mockPublisher.publish).toHaveBeenCalledWith('EstimateCreated', expect.objectContaining({
                organizationId: ORG_ID,
                customerId: 'cust-1',
                propertyId: 'prop-1',
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('EstimatesCreated', expect.any(String), 1);
        });

        it('should generate estimate with flat-rate pricing when no measurement key', async () => {
            mockPropertyRepo.get.mockResolvedValue(mockProperty);
            mockServiceTypeRepo.get.mockResolvedValue(mockFlatServiceType);
            mockEstimateRepo.create.mockImplementation(async (e: any) => e);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.generateEstimate(ORG_ID, {
                customerId: 'cust-1',
                propertyId: 'prop-1',
                serviceTypeIds: ['st-2'],
            });

            expect(result.lineItems).toHaveLength(1);
            expect(result.lineItems[0].total).toBe(7500);
            expect(result.lineItems[0].quantity).toBe(1);
            expect(result.lineItems[0].unit).toBe('per_visit');
        });

        it('should resolve service types from planId', async () => {
            mockPropertyRepo.get.mockResolvedValue(mockProperty);
            mockPlanServiceRepo.listByPlanId.mockResolvedValue({
                items: [{ serviceTypeId: 'st-2' }],
                cursor: null,
            });
            mockServiceTypeRepo.get.mockResolvedValue(mockFlatServiceType);
            mockEstimateRepo.create.mockImplementation(async (e: any) => e);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.generateEstimate(ORG_ID, {
                customerId: 'cust-1',
                propertyId: 'prop-1',
                planId: 'plan-1',
            });

            expect(result.lineItems).toHaveLength(1);
            expect(mockPlanServiceRepo.listByPlanId).toHaveBeenCalledWith(ORG_ID, 'plan-1');
        });

        it('should throw 404 when property not found', async () => {
            mockPropertyRepo.get.mockResolvedValue(null);

            await expect(service.generateEstimate(ORG_ID, {
                customerId: 'cust-1',
                propertyId: 'missing',
                serviceTypeIds: ['st-1'],
            })).rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 when no service types resolved', async () => {
            mockPropertyRepo.get.mockResolvedValue(mockProperty);
            mockPlanServiceRepo.listByPlanId.mockResolvedValue({ items: [], cursor: null });

            await expect(service.generateEstimate(ORG_ID, {
                customerId: 'cust-1',
                propertyId: 'prop-1',
                planId: 'plan-empty',
            })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw 404 when service type not found', async () => {
            mockPropertyRepo.get.mockResolvedValue(mockProperty);
            mockServiceTypeRepo.get.mockResolvedValue(null);

            await expect(service.generateEstimate(ORG_ID, {
                customerId: 'cust-1',
                propertyId: 'prop-1',
                serviceTypeIds: ['st-missing'],
            })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getEstimate', () => {
        it('should return estimate when found', async () => {
            const estimate = { organizationId: ORG_ID, estimateId: 'est-1', status: 'draft' };
            mockEstimateRepo.get.mockResolvedValue(estimate);

            const result = await service.getEstimate(ORG_ID, 'est-1');

            expect(result).toEqual(estimate);
        });

        it('should throw 404 when estimate not found', async () => {
            mockEstimateRepo.get.mockResolvedValue(null);

            await expect(service.getEstimate(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getEstimate(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listEstimatesByCustomer', () => {
        it('should delegate to repository', async () => {
            const paginated = { items: [{ estimateId: 'est-1' }], cursor: null };
            mockEstimateRepo.listByCustomerId.mockResolvedValue(paginated);

            const result = await service.listEstimatesByCustomer(ORG_ID, 'cust-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockEstimateRepo.listByCustomerId).toHaveBeenCalledWith(ORG_ID, 'cust-1', { limit: 10 });
        });
    });

    describe('updateEstimate', () => {
        it('should transition draft to sent', async () => {
            const existing = { organizationId: ORG_ID, estimateId: 'est-1', status: 'draft', customerId: 'cust-1', propertyId: 'prop-1' };
            const updated = { ...existing, status: 'sent' };
            mockEstimateRepo.get.mockResolvedValue(existing);
            mockEstimateRepo.update.mockResolvedValue(updated);

            const result = await service.updateEstimate(ORG_ID, 'est-1', { status: 'sent' });

            expect(result.status).toBe('sent');
        });

        it('should transition sent to accepted and set acceptedAt', async () => {
            const existing = { organizationId: ORG_ID, estimateId: 'est-1', status: 'sent', customerId: 'cust-1', propertyId: 'prop-1' };
            const updated = { ...existing, status: 'accepted', acceptedAt: '2026-03-04T00:00:00.000Z' };
            mockEstimateRepo.get.mockResolvedValue(existing);
            mockEstimateRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateEstimate(ORG_ID, 'est-1', { status: 'accepted' });

            expect(result.status).toBe('accepted');
            expect(mockEstimateRepo.update).toHaveBeenCalledWith(ORG_ID, 'est-1', expect.objectContaining({
                status: 'accepted',
                acceptedAt: expect.any(String),
            }));
            expect(mockPublisher.publish).toHaveBeenCalledWith('EstimateAccepted', expect.objectContaining({
                organizationId: ORG_ID,
                estimateId: 'est-1',
            }));
        });

        it('should reject invalid status transitions', async () => {
            const existing = { organizationId: ORG_ID, estimateId: 'est-1', status: 'draft', customerId: 'cust-1' };
            mockEstimateRepo.get.mockResolvedValue(existing);

            await expect(service.updateEstimate(ORG_ID, 'est-1', { status: 'accepted' })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should reject transition from accepted', async () => {
            const existing = { organizationId: ORG_ID, estimateId: 'est-1', status: 'accepted', customerId: 'cust-1' };
            mockEstimateRepo.get.mockResolvedValue(existing);

            await expect(service.updateEstimate(ORG_ID, 'est-1', { status: 'draft' })).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('deleteEstimate', () => {
        it('should delete draft estimate', async () => {
            const existing = { organizationId: ORG_ID, estimateId: 'est-1', status: 'draft' };
            mockEstimateRepo.get.mockResolvedValue(existing);
            mockEstimateRepo.delete.mockResolvedValue(undefined);

            await service.deleteEstimate(ORG_ID, 'est-1');

            expect(mockEstimateRepo.delete).toHaveBeenCalledWith(ORG_ID, 'est-1');
        });

        it('should reject deleting non-draft estimate', async () => {
            const existing = { organizationId: ORG_ID, estimateId: 'est-1', status: 'sent' };
            mockEstimateRepo.get.mockResolvedValue(existing);

            await expect(service.deleteEstimate(ORG_ID, 'est-1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('convertToInvoice', () => {
        it('should convert accepted estimate to invoice', async () => {
            const estimate = {
                organizationId: ORG_ID,
                estimateId: 'est-1',
                customerId: 'cust-1',
                propertyId: 'prop-1',
                status: 'accepted',
                subtotal: 25000,
                tax: 0,
                total: 25000,
                lineItems: [{ serviceTypeId: 'st-1', description: 'Lawn Mowing', quantity: 1, unit: 'per_visit', unitPrice: 25000, total: 25000 }],
            };
            mockEstimateRepo.get.mockResolvedValue(estimate);

            const createdInvoice = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1' };
            mockInvoiceRepo.create.mockResolvedValue(createdInvoice);

            const updatedEstimate = { ...estimate, status: 'invoiced', invoiceId: 'inv-1' };
            mockEstimateRepo.update.mockResolvedValue(updatedEstimate);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.convertToInvoice(ORG_ID, 'est-1');

            expect(result.invoiceId).toBe('inv-1');
            expect(result.estimate.status).toBe('invoiced');
            expect(mockPublisher.publish).toHaveBeenCalledWith('EstimateInvoiced', expect.objectContaining({
                estimateId: 'est-1',
                invoiceId: 'inv-1',
            }));
            expect(mockPublisher.publish).toHaveBeenCalledWith('InvoiceCreated', expect.objectContaining({
                invoiceId: 'inv-1',
            }));
        });

        it('should reject converting non-accepted estimate', async () => {
            const estimate = { organizationId: ORG_ID, estimateId: 'est-1', status: 'draft' };
            mockEstimateRepo.get.mockResolvedValue(estimate);

            await expect(service.convertToInvoice(ORG_ID, 'est-1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should reject converting already invoiced estimate', async () => {
            const estimate = { organizationId: ORG_ID, estimateId: 'est-1', status: 'accepted', invoiceId: 'inv-existing' };
            mockEstimateRepo.get.mockResolvedValue(estimate);

            await expect(service.convertToInvoice(ORG_ID, 'est-1')).rejects.toMatchObject({ statusCode: 400 });
        });
    });
});
