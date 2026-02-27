import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { CustomerService } from '../../src/application/customer-service';
import { AppError } from '../../src/lib/error';

const mockCustomerRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockAccountRepo = {
    create: vi.fn(),
    get: vi.fn(),
    getByCustomerId: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

describe('CustomerService', () => {
    let service: CustomerService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CustomerService(mockCustomerRepo as any, mockAccountRepo as any, mockPublisher as any);
    });

    describe('createCustomer', () => {
        it('should create customer and account, publish CustomerCreated event, and record metric', async () => {
            const request = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '555-0100',
                notes: 'VIP customer',
            };

            const createdCustomer = {
                customerId: 'cust-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };
            const createdAccount = {
                accountId: 'acct-1',
                customerId: 'cust-1',
                status: 'active',
                billingEmail: request.email,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockCustomerRepo.create.mockResolvedValue(createdCustomer);
            mockAccountRepo.create.mockResolvedValue(createdAccount);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createCustomer(request);

            expect(result.customer).toEqual(createdCustomer);
            expect(result.account).toEqual(createdAccount);
            expect(mockCustomerRepo.create).toHaveBeenCalledOnce();
            expect(mockAccountRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('CustomerCreated', expect.objectContaining({
                customerId: expect.any(String),
                accountId: expect.any(String),
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('CustomersCreated', expect.any(String), 1);
        });

        it('should set customer status to active and populate createdAt', async () => {
            const request = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@example.com',
                phone: '555-0200',
            };

            mockCustomerRepo.create.mockImplementation(async (c: any) => c);
            mockAccountRepo.create.mockImplementation(async (a: any) => a);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createCustomer(request);

            expect(result.customer.status).toBe('active');
            expect(result.customer.createdAt).toEqual(expect.any(String));
            expect(result.customer.customerId).toEqual(expect.any(String));
        });
    });

    describe('getCustomer', () => {
        it('should return customer when found', async () => {
            const customer = { customerId: 'cust-1', firstName: 'John', status: 'active' };
            mockCustomerRepo.get.mockResolvedValue(customer);

            const result = await service.getCustomer('cust-1');

            expect(result).toEqual(customer);
            expect(mockCustomerRepo.get).toHaveBeenCalledWith('cust-1');
        });

        it('should throw AppError 404 when customer not found', async () => {
            mockCustomerRepo.get.mockResolvedValue(null);

            await expect(service.getCustomer('missing')).rejects.toThrow(AppError);
            await expect(service.getCustomer('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listCustomers', () => {
        it('should delegate to repo.list with options', async () => {
            const paginated = { items: [{ customerId: 'cust-1' }], count: 1 };
            mockCustomerRepo.list.mockResolvedValue(paginated);

            const options = { limit: 10 };
            const result = await service.listCustomers(options);

            expect(result).toEqual(paginated);
            expect(mockCustomerRepo.list).toHaveBeenCalledWith(options);
        });
    });

    describe('updateCustomer', () => {
        it('should update customer successfully', async () => {
            const existing = { customerId: 'cust-1', status: 'active' };
            const updated = { customerId: 'cust-1', status: 'active', phone: '555-9999' };
            mockCustomerRepo.get.mockResolvedValue(existing);
            mockCustomerRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateCustomer('cust-1', { phone: '555-9999' });

            expect(result).toEqual(updated);
            expect(mockCustomerRepo.update).toHaveBeenCalledWith('cust-1', { phone: '555-9999' });
        });

        it('should publish CustomerStatusChanged when status changes', async () => {
            const existing = { customerId: 'cust-1', status: 'active' };
            const updated = { customerId: 'cust-1', status: 'inactive' };
            mockCustomerRepo.get.mockResolvedValue(existing);
            mockCustomerRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.updateCustomer('cust-1', { status: 'inactive' });

            expect(mockPublisher.publish).toHaveBeenCalledWith('CustomerStatusChanged', {
                customerId: 'cust-1',
                previousStatus: 'active',
                newStatus: 'inactive',
            });
        });

        it('should NOT publish CustomerStatusChanged when status does not change', async () => {
            const existing = { customerId: 'cust-1', status: 'active' };
            const updated = { customerId: 'cust-1', status: 'active', phone: '555-1234' };
            mockCustomerRepo.get.mockResolvedValue(existing);
            mockCustomerRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.updateCustomer('cust-1', { phone: '555-1234', status: 'active' });

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if customer not found during update', async () => {
            mockCustomerRepo.get.mockResolvedValue(null);

            await expect(service.updateCustomer('missing', { phone: '555-0000' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteCustomer', () => {
        it('should delete customer', async () => {
            mockCustomerRepo.delete.mockResolvedValue(undefined);

            await service.deleteCustomer('cust-1');

            expect(mockCustomerRepo.delete).toHaveBeenCalledWith('cust-1');
        });
    });

    describe('getCustomerAccount', () => {
        it('should return account for a valid customer', async () => {
            const customer = { customerId: 'cust-1' };
            const account = { accountId: 'acct-1', customerId: 'cust-1' };
            mockCustomerRepo.get.mockResolvedValue(customer);
            mockAccountRepo.getByCustomerId.mockResolvedValue(account);

            const result = await service.getCustomerAccount('cust-1');

            expect(result).toEqual(account);
            expect(mockAccountRepo.getByCustomerId).toHaveBeenCalledWith('cust-1');
        });

        it('should throw 404 if customer not found', async () => {
            mockCustomerRepo.get.mockResolvedValue(null);

            await expect(service.getCustomerAccount('missing')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 404 if account not found for customer', async () => {
            const customer = { customerId: 'cust-1' };
            mockCustomerRepo.get.mockResolvedValue(customer);
            mockAccountRepo.getByCustomerId.mockResolvedValue(null);

            await expect(service.getCustomerAccount('cust-1')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
