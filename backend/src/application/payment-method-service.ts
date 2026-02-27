import { PaymentMethod, CreatePaymentMethodRequest, PaymentMethodRepository } from "../domain/payment-method";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PaymentMethodService {
    constructor(
        private repository: PaymentMethodRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createPaymentMethod(organizationId: string, request: CreatePaymentMethodRequest): Promise<PaymentMethod> {
        logger.info("Creating payment method", { customerId: request.customerId, type: request.type });

        const paymentMethod: PaymentMethod = {
            organizationId,
            paymentMethodId: randomUUID(),
            customerId: request.customerId,
            type: request.type,
            last4: request.last4,
            isDefault: request.isDefault,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(paymentMethod);
        metrics.addMetric('PaymentMethodsAdded', MetricUnit.Count, 1);
        await this.eventPublisher.publish("PaymentMethodAdded", {
            organizationId,
            paymentMethodId: created.paymentMethodId,
            customerId: request.customerId,
        });

        return created;
    }

    async getPaymentMethod(organizationId: string, paymentMethodId: string): Promise<PaymentMethod> {
        const paymentMethod = await this.repository.get(organizationId, paymentMethodId);
        if (!paymentMethod) {
            throw new AppError("Payment method not found", 404);
        }
        return paymentMethod;
    }

    async listPaymentMethodsByCustomer(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<PaymentMethod>> {
        return this.repository.listByCustomerId(organizationId, customerId, options);
    }

    async deletePaymentMethod(organizationId: string, paymentMethodId: string): Promise<void> {
        const paymentMethod = await this.getPaymentMethod(organizationId, paymentMethodId);
        await this.repository.delete(organizationId, paymentMethodId);
        await this.eventPublisher.publish("PaymentMethodRemoved", {
            organizationId,
            paymentMethodId,
            customerId: paymentMethod.customerId,
        });
        logger.info("Payment method deleted", { paymentMethodId });
    }
}
