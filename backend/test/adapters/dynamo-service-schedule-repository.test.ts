import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            serviceSchedule: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byServicerId: vi.fn(),
                },
                patch: vi.fn(),
            },
        },
    },
}));

import { DynamoServiceScheduleRepository } from '../../src/adapters/dynamo-service-schedule-repository';
import { DBService } from '../../src/entities/service';

const mockSchedule = {
    serviceScheduleId: 'ss-1',
    serviceId: 'svc-1',
    servicerId: 'sr-1',
    scheduledDate: '2024-03-15',
    scheduledTime: '09:00',
    estimatedDuration: 120,
    status: 'scheduled' as const,
    completedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoServiceScheduleRepository', () => {
    let repo: DynamoServiceScheduleRepository;
    const mockEntity = (DBService.entities.serviceSchedule as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoServiceScheduleRepository();
    });

    describe('create', () => {
        it('should create a service schedule and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockSchedule }) });

            const result = await repo.create(mockSchedule);

            expect(result.serviceScheduleId).toBe('ss-1');
            expect(result.scheduledDate).toBe('2024-03-15');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { serviceScheduleId: 'ss-1' } }) });

            await expect(repo.create(mockSchedule)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed schedule when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockSchedule }) });

            const result = await repo.get('ss-1');

            expect(result).not.toBeNull();
            expect(result!.serviceScheduleId).toBe('ss-1');
        });

        it('should return null when schedule not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('ss-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('ss-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByServicerId', () => {
        it('should return paginated list of schedules for a servicer', async () => {
            mockEntity.query.byServicerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockSchedule], cursor: null }),
            });

            const result = await repo.listByServicerId('sr-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].serviceScheduleId).toBe('ss-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockSchedule], cursor: 'next-page' });
            mockEntity.query.byServicerId.mockReturnValue({ go: mockGo });

            const result = await repo.listByServicerId('sr-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byServicerId).toHaveBeenCalledWith({ servicerId: 'sr-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byServicerId.mockReturnValue({ go: mockGo });

            await repo.listByServicerId('sr-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a service schedule and return the parsed result', async () => {
            const updated = { ...mockSchedule, status: 'completed' as const, completedAt: '2024-03-15T11:00:00.000Z' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('ss-1', { status: 'completed' });

            expect(result.status).toBe('completed');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('ss-1', { status: 'completed' })).rejects.toThrow('Data integrity error');
        });
    });
});
