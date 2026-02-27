import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            paySchedule: {
                create: vi.fn(),
                get: vi.fn(),
                scan: { go: vi.fn() },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPayScheduleRepository } from '../../src/adapters/dynamo-pay-schedule-repository';
import { DBService } from '../../src/entities/service';

const mockPaySchedule = {
    payScheduleId: 'ps-1',
    name: 'Bi-Weekly',
    frequency: 'biweekly' as const,
    dayOfWeek: 5,
    dayOfMonth: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPayScheduleRepository', () => {
    let repo: DynamoPayScheduleRepository;
    const mockEntity = (DBService.entities.paySchedule as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPayScheduleRepository();
    });

    describe('create', () => {
        it('should create a pay schedule and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPaySchedule }) });

            const result = await repo.create(mockPaySchedule);

            expect(result.payScheduleId).toBe('ps-1');
            expect(result.name).toBe('Bi-Weekly');
            expect(result.frequency).toBe('biweekly');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { payScheduleId: 'ps-1' } }) });

            await expect(repo.create(mockPaySchedule)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed pay schedule when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPaySchedule }) });

            const result = await repo.get('ps-1');

            expect(result).not.toBeNull();
            expect(result!.payScheduleId).toBe('ps-1');
        });

        it('should return null when pay schedule not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('ps-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('ps-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of pay schedules', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockPaySchedule], cursor: null });

            const result = await repo.list();

            expect(result.items).toHaveLength(1);
            expect(result.items[0].payScheduleId).toBe('ps-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options to scan', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockPaySchedule], cursor: 'next-page' });

            const result = await repo.list({ limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.scan.go).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [], cursor: null });

            await repo.list();

            expect(mockEntity.scan.go).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a pay schedule and return the parsed result', async () => {
            const updated = { ...mockPaySchedule, name: 'Weekly' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('ps-1', { name: 'Weekly' });

            expect(result.name).toBe('Weekly');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('ps-1', { name: 'Weekly' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a pay schedule', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('ps-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ payScheduleId: 'ps-1' });
        });
    });
});
