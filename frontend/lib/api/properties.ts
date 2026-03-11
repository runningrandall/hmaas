import { apiGet, apiPost, apiPut, apiDelete } from './client';

/** Well-known measurement keys displayed in the property admin form. */
export const MEASUREMENT_FIELDS = [
    { key: 'yardSizeSqft', label: 'Yard Size', unit: 'sq ft', placeholder: '5000' },
    { key: 'concreteSizeSqft', label: 'Concrete/Patio Size', unit: 'sq ft', placeholder: '400' },
    { key: 'lawnEdgeLinearFeet', label: 'Lawn Edge', unit: 'linear ft', placeholder: '200' },
    { key: 'windowCount', label: 'Number of Windows', unit: 'count', placeholder: '20' },
    { key: 'homeSizeSqft', label: 'Home Size', unit: 'sq ft', placeholder: '2500' },
    { key: 'maxWindowHeight', label: 'Max Window Height', unit: 'ft', placeholder: '12' },
    { key: 'stories', label: 'Stories', unit: 'count', placeholder: '2' },
    { key: 'gutterLinearFeet', label: 'Gutter Length', unit: 'linear ft', placeholder: '150' },
    { key: 'bedrooms', label: 'Bedrooms', unit: 'count', placeholder: '4' },
    { key: 'bathrooms', label: 'Bathrooms', unit: 'count', placeholder: '3' },
    { key: 'garageSpaces', label: 'Garage Spaces', unit: 'count', placeholder: '2' },
    { key: 'deckSizeSqft', label: 'Deck/Porch Size', unit: 'sq ft', placeholder: '300' },
    { key: 'fenceLinearFeet', label: 'Fence Length', unit: 'linear ft', placeholder: '250' },
    { key: 'roofSizeSqft', label: 'Roof Size', unit: 'sq ft', placeholder: '3000' },
    { key: 'drivewaySquareFeet', label: 'Driveway Size', unit: 'sq ft', placeholder: '600' },
    { key: 'treesCount', label: 'Number of Trees', unit: 'count', placeholder: '8' },
    { key: 'shrubsCount', label: 'Number of Shrubs', unit: 'count', placeholder: '15' },
    { key: 'sprinklerZones', label: 'Sprinkler Zones', unit: 'count', placeholder: '6' },
] as const;

export interface Property {
    organizationId: string;
    propertyId: string;
    customerId: string;
    propertyTypeId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
    lotSize?: number;
    measurements?: Record<string, number>;
    notes?: string;
    status?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePropertyData {
    propertyTypeId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
    lotSize?: number;
    measurements?: Record<string, number>;
    notes?: string;
}

export interface UpdatePropertyData {
    propertyTypeId?: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    lotSize?: number;
    measurements?: Record<string, number>;
    notes?: string;
    status?: string;
}

export interface PaginatedProperties {
    items: Property[];
    cursor?: string | null;
}

export const propertiesApi = {
    listByCustomer: (customerId: string) =>
        apiGet<PaginatedProperties>(`customers/${customerId}/properties`),
    get: (id: string) => apiGet<Property>(`properties/${id}`),
    create: (customerId: string, data: CreatePropertyData) =>
        apiPost<Property>(`customers/${customerId}/properties`, data),
    update: (id: string, data: UpdatePropertyData) =>
        apiPut<Property>(`properties/${id}`, data),
    delete: (id: string) => apiDelete(`properties/${id}`),
};
