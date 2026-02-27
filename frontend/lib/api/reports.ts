import { apiGet } from './client';

export interface Report {
    reportId: string;
    name: string;
    email?: string;
    phone?: string;
    concernType: string;
    description?: string;
    dateObserved?: string;
    timeObserved?: string;
    locationDescription: string;
    location: { lat: number; lng: number };
    imageUrls?: string[];
    status: string;
    createdAt: string;
}

export async function getReport(reportId: string): Promise<Report> {
    return apiGet<Report>(`/reports/${reportId}`);
}
