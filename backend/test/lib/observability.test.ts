import { describe, it, expect } from 'vitest';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { logger, tracer, metrics } from '../../src/lib/observability';

describe('observability', () => {
    it('should export a Logger instance', () => {
        expect(logger).toBeInstanceOf(Logger);
    });

    it('should export a Tracer instance', () => {
        expect(tracer).toBeInstanceOf(Tracer);
    });

    it('should export a Metrics instance', () => {
        expect(metrics).toBeInstanceOf(Metrics);
    });

    it('logger should use the correct service name', () => {
        expect(logger.powertoolsLogData.serviceName).toBe('versa-backend');
    });

    it('tracer should use the correct service name', () => {
        expect(tracer.serviceName).toBe('versa-backend');
    });

    it('metrics should use the correct namespace', () => {
        expect(metrics.namespace).toBe('Versa');
    });
});
