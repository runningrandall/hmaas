import { PaymentMethodRepository, PaymentMethod } from "../domain/payment-method";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPaymentMethodSchema = z.object({
    paymentMethodId: z.string(),
    customerId: z.string(),
    type: z.enum(["credit_card", "debit_card", "bank_account", "ach"]),
    last4: z.string(),
    isDefault: z.boolean().optional().nullable(),
    status: z.enum(["active", "inactive"]),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePaymentMethod(data: unknown): PaymentMethod {
    const result = DynamoPaymentMethodSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as PaymentMethod;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPaymentMethodRepository implements PaymentMethodRepository {
    async create(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
        const { createdAt, updatedAt, ...data } = paymentMethod;
        const result = await DBService.entities.paymentMethod.create(data).go();
        return parsePaymentMethod(result.data);
    }

    async get(paymentMethodId: string): Promise<PaymentMethod | null> {
        const result = await DBService.entities.paymentMethod.get({ paymentMethodId }).go();
        if (!result.data) return null;
        return parsePaymentMethod(result.data);
    }

    async listByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<PaymentMethod>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.paymentMethod.query.byCustomerId({ customerId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePaymentMethod),
            cursor: result.cursor ?? null,
        };
    }

    async delete(paymentMethodId: string): Promise<void> {
        await DBService.entities.paymentMethod.delete({ paymentMethodId }).go();
    }
}
