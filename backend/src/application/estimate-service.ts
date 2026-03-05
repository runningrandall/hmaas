import { Estimate, EstimateLineItem, GenerateEstimateRequest, UpdateEstimateRequest } from "../domain/estimate";
import { EstimateRepository } from "../ports/estimate-repository";
import { PropertyRepository } from "../ports/property-repository";
import { ServiceTypeRepository } from "../ports/service-type-repository";
import { PlanServiceRepository } from "../ports/plan-service-repository";
import { InvoiceRepository } from "../ports/invoice-repository";
import { EventPublisher } from "../ports/event-publisher";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";
import { ServiceType } from "../domain/service-type";
import { Property } from "../domain/property";

const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ["sent"],
    sent: ["accepted", "rejected", "expired"],
};

export class EstimateService {
    constructor(
        private estimateRepository: EstimateRepository,
        private propertyRepository: PropertyRepository,
        private serviceTypeRepository: ServiceTypeRepository,
        private planServiceRepository: PlanServiceRepository,
        private invoiceRepository: InvoiceRepository,
        private eventPublisher: EventPublisher
    ) {}

    async generateEstimate(organizationId: string, request: GenerateEstimateRequest): Promise<Estimate> {
        logger.info("Generating estimate", { customerId: request.customerId, propertyId: request.propertyId });

        const property = await this.propertyRepository.get(organizationId, request.propertyId);
        if (!property) {
            throw new AppError("Property not found", 404);
        }

        let serviceTypeIds: string[] = [];
        if (request.serviceTypeIds && request.serviceTypeIds.length > 0) {
            serviceTypeIds = request.serviceTypeIds;
        } else if (request.planId) {
            const planServices = await this.planServiceRepository.listByPlanId(organizationId, request.planId);
            serviceTypeIds = planServices.items.map(ps => ps.serviceTypeId);
        }

        if (serviceTypeIds.length === 0) {
            throw new AppError("No service types resolved for estimate", 400);
        }

        const serviceTypes: ServiceType[] = [];
        for (const stId of serviceTypeIds) {
            const st = await this.serviceTypeRepository.get(organizationId, stId);
            if (!st) {
                throw new AppError(`Service type ${stId} not found`, 404);
            }
            serviceTypes.push(st);
        }

        const lineItems = serviceTypes.map(st => this.buildLineItem(st, property));
        const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);

        const estimate: Estimate = {
            organizationId,
            estimateId: randomUUID(),
            customerId: request.customerId,
            propertyId: request.propertyId,
            estimateNumber: `EST-${Date.now()}`,
            estimateDate: new Date().toISOString().split('T')[0],
            expirationDate: request.expirationDate,
            status: "draft",
            subtotal,
            tax: 0,
            total: subtotal,
            lineItems,
            notes: request.notes,
            createdAt: new Date().toISOString(),
        };

        const created = await this.estimateRepository.create(estimate);
        metrics.addMetric('EstimatesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("EstimateCreated", {
            organizationId,
            estimateId: created.estimateId,
            customerId: request.customerId,
            propertyId: request.propertyId,
        });

        return created;
    }

    async getEstimate(organizationId: string, estimateId: string): Promise<Estimate> {
        const estimate = await this.estimateRepository.get(organizationId, estimateId);
        if (!estimate) {
            throw new AppError("Estimate not found", 404);
        }
        return estimate;
    }

    async listEstimatesByCustomer(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Estimate>> {
        return this.estimateRepository.listByCustomerId(organizationId, customerId, options);
    }

    async updateEstimate(organizationId: string, estimateId: string, request: UpdateEstimateRequest): Promise<Estimate> {
        const existing = await this.getEstimate(organizationId, estimateId);

        if (request.status && request.status !== existing.status) {
            const allowed = VALID_TRANSITIONS[existing.status];
            if (!allowed || !allowed.includes(request.status)) {
                throw new AppError(`Cannot transition from ${existing.status} to ${request.status}`, 400);
            }
        }

        const updateData: Record<string, unknown> = {};
        if (request.status) updateData.status = request.status;
        if (request.lineItems) {
            updateData.lineItems = request.lineItems;
            const subtotal = request.lineItems.reduce((sum, li) => sum + li.total, 0);
            updateData.subtotal = subtotal;
            updateData.total = subtotal;
        }
        if (request.notes !== undefined) updateData.notes = request.notes;
        if (request.expirationDate !== undefined) updateData.expirationDate = request.expirationDate;

        if (request.status === "accepted") {
            updateData.acceptedAt = new Date().toISOString();
        }

        const updated = await this.estimateRepository.update(organizationId, estimateId, updateData);

        if (request.status === "accepted") {
            await this.eventPublisher.publish("EstimateAccepted", {
                organizationId,
                estimateId,
                customerId: existing.customerId,
                propertyId: existing.propertyId,
            });
        }

        return updated;
    }

    async deleteEstimate(organizationId: string, estimateId: string): Promise<void> {
        const existing = await this.getEstimate(organizationId, estimateId);
        if (existing.status !== "draft") {
            throw new AppError("Only draft estimates can be deleted", 400);
        }
        await this.estimateRepository.delete(organizationId, estimateId);
        logger.info("Estimate deleted", { estimateId });
    }

    async convertToInvoice(organizationId: string, estimateId: string): Promise<{ estimate: Estimate; invoiceId: string }> {
        const estimate = await this.getEstimate(organizationId, estimateId);

        if (estimate.status !== "accepted") {
            throw new AppError("Only accepted estimates can be converted to invoices", 400);
        }
        if (estimate.invoiceId) {
            throw new AppError("Estimate has already been converted to an invoice", 400);
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const invoice = {
            organizationId,
            invoiceId: randomUUID(),
            customerId: estimate.customerId,
            invoiceNumber: `INV-${Date.now()}`,
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            subtotal: estimate.subtotal,
            tax: estimate.tax,
            total: estimate.total,
            status: "draft" as const,
            lineItems: estimate.lineItems.map(li => ({
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                total: li.total,
            })),
            createdAt: new Date().toISOString(),
        };

        const createdInvoice = await this.invoiceRepository.create(invoice);

        const updatedEstimate = await this.estimateRepository.update(organizationId, estimateId, {
            status: "invoiced",
            invoiceId: createdInvoice.invoiceId,
        });

        await this.eventPublisher.publish("EstimateInvoiced", {
            organizationId,
            estimateId,
            invoiceId: createdInvoice.invoiceId,
            customerId: estimate.customerId,
        });

        await this.eventPublisher.publish("InvoiceCreated", {
            organizationId,
            invoiceId: createdInvoice.invoiceId,
            customerId: estimate.customerId,
        });

        return { estimate: updatedEstimate, invoiceId: createdInvoice.invoiceId };
    }

    private buildLineItem(serviceType: ServiceType, property: Property): EstimateLineItem {
        const hasMeasurement = serviceType.measurementKey
            && serviceType.ratePerUnit != null
            && property.measurements
            && property.measurements[serviceType.measurementKey] != null;

        if (hasMeasurement) {
            const measurementValue = property.measurements![serviceType.measurementKey!];
            const total = (serviceType.basePrice || 0) + (serviceType.ratePerUnit! * measurementValue);
            const unit = serviceType.measurementUnit || serviceType.measurementKey!;
            const estimatedDuration = serviceType.durationPerUnit != null
                ? (serviceType.estimatedDuration || 0) + (serviceType.durationPerUnit * measurementValue)
                : serviceType.estimatedDuration;

            return {
                serviceTypeId: serviceType.serviceTypeId,
                description: `${serviceType.name} - ${measurementValue} ${unit}`,
                quantity: measurementValue,
                unit,
                unitPrice: serviceType.ratePerUnit!,
                total,
                estimatedDuration,
            };
        }

        return {
            serviceTypeId: serviceType.serviceTypeId,
            description: serviceType.name,
            quantity: 1,
            unit: serviceType.unit || "per_visit",
            unitPrice: serviceType.basePrice || 0,
            total: serviceType.basePrice || 0,
            estimatedDuration: serviceType.estimatedDuration,
        };
    }
}
