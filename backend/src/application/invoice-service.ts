import { Invoice, CreateInvoiceRequest, UpdateInvoiceRequest, InvoiceRepository } from "../domain/invoice";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class InvoiceService {
    constructor(
        private repository: InvoiceRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
        logger.info("Creating invoice", { customerId: request.customerId, invoiceNumber: request.invoiceNumber });

        const invoice: Invoice = {
            invoiceId: randomUUID(),
            customerId: request.customerId,
            invoiceNumber: request.invoiceNumber,
            invoiceDate: request.invoiceDate,
            dueDate: request.dueDate,
            subtotal: request.subtotal,
            tax: request.tax,
            total: request.total,
            status: "draft",
            lineItems: request.lineItems,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(invoice);
        metrics.addMetric('InvoicesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("InvoiceCreated", { invoiceId: created.invoiceId, customerId: request.customerId });

        return created;
    }

    async getInvoice(invoiceId: string): Promise<Invoice> {
        const invoice = await this.repository.get(invoiceId);
        if (!invoice) {
            throw new AppError("Invoice not found", 404);
        }
        return invoice;
    }

    async listInvoicesByCustomer(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Invoice>> {
        return this.repository.listByCustomerId(customerId, options);
    }

    async updateInvoice(invoiceId: string, request: UpdateInvoiceRequest): Promise<Invoice> {
        const existing = await this.getInvoice(invoiceId);

        // If status is being changed to "paid", set paidAt timestamp
        if (request.status === "paid" && existing.status !== "paid") {
            request.paidAt = new Date().toISOString();
        }

        const updated = await this.repository.update(invoiceId, request);

        // Publish InvoicePaid event when status transitions to paid
        if (request.status === "paid" && existing.status !== "paid") {
            metrics.addMetric('InvoicesPaid', MetricUnit.Count, 1);
            await this.eventPublisher.publish("InvoicePaid", {
                invoiceId,
                customerId: existing.customerId,
                total: updated.total,
                paidAt: updated.paidAt,
            });
        }

        return updated;
    }
}
