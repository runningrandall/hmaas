'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { propertiesApi, Property, UpdatePropertyData, MEASUREMENT_FIELDS } from '@/lib/api/properties';
import { formatStateInput } from '@/lib/format';
import { propertyTypesApi, PropertyType } from '@/lib/api/property-types';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryTagInput from '@/components/CategoryTagInput';

export default function PropertyDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const propertyId = searchParams.get('id');

    const [property, setProperty] = useState<Property | null>(null);
    const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState<UpdatePropertyData & { measurements: Record<string, number> }>({
        measurements: {},
    });

    const loadProperty = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            const [data, ptData] = await Promise.all([
                propertiesApi.get(propertyId),
                propertyTypesApi.list(),
            ]);
            setProperty(data);
            setPropertyTypes(ptData.items || []);
            setForm({
                propertyTypeId: data.propertyTypeId,
                name: data.name,
                address: data.address,
                city: data.city,
                state: data.state,
                zip: data.zip,
                lat: data.lat,
                lng: data.lng,
                lotSize: data.lotSize,
                notes: data.notes || '',
                status: data.status || 'active',
                measurements: data.measurements || {},
            });
            setError('');
        } catch {
            setError('Failed to load property.');
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        if (!propertyId) {
            router.push('/admin/properties');
            return;
        }
        loadProperty();
    }, [isSuperAdmin, router, propertyId, loadProperty]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propertyId) return;
        setSaving(true);
        setSuccess('');
        try {
            const updated = await propertiesApi.update(propertyId, form);
            setProperty(updated);
            setEditing(false);
            setSuccess('Property updated.');
            setError('');
        } catch {
            setError('Failed to update property.');
        } finally {
            setSaving(false);
        }
    };

    const setMeasurement = (key: string, value: string) => {
        const measurements = { ...form.measurements };
        if (value === '' || value === undefined) {
            delete measurements[key];
        } else {
            measurements[key] = parseFloat(value);
        }
        setForm({ ...form, measurements });
    };

    const getPropertyTypeName = (propertyTypeId: string) => {
        const pt = propertyTypes.find((p) => p.propertyTypeId === propertyTypeId);
        return pt?.name || propertyTypeId;
    };

    if (!isSuperAdmin) return null;

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="space-y-4">
                <Link href="/admin/properties" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Properties
                </Link>
                <p className="text-muted-foreground">Property not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/properties" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Properties
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="h-6 w-6" />
                        {property.name}
                    </h1>
                    <Badge variant={property.status === 'active' || !property.status ? 'default' : 'secondary'}>
                        {property.status || 'active'}
                    </Badge>
                </div>
                <p className="text-muted-foreground">
                    {property.address}, {property.city}, {property.state} {property.zip}
                </p>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-md border border-emerald-500/20 text-sm">
                    {success}
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Property Details</CardTitle>
                                <CardDescription>View and edit property information.</CardDescription>
                            </div>
                            {!editing && (
                                <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Property Name</Label>
                                        <Input
                                            id="name"
                                            value={form.name || ''}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="propertyTypeId">Property Type</Label>
                                        <select
                                            id="propertyTypeId"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.propertyTypeId || ''}
                                            onChange={(e) => setForm({ ...form, propertyTypeId: e.target.value })}
                                            disabled={!editing}
                                        >
                                            <option value="">Select property type</option>
                                            {propertyTypes.map((pt) => (
                                                <option key={pt.propertyTypeId} value={pt.propertyTypeId}>
                                                    {pt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={form.address || ''}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={form.city || ''}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={form.state || ''}
                                            onChange={(e) => setForm({ ...form, state: formatStateInput(e.target.value) })}
                                            disabled={!editing}
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="zip">ZIP</Label>
                                        <Input
                                            id="zip"
                                            value={form.zip || ''}
                                            onChange={(e) => setForm({ ...form, zip: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="lat">Latitude</Label>
                                        <Input
                                            id="lat"
                                            type="number"
                                            step="any"
                                            value={form.lat ?? ''}
                                            onChange={(e) => setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            disabled={!editing}
                                            placeholder="39.7817"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lng">Longitude</Label>
                                        <Input
                                            id="lng"
                                            type="number"
                                            step="any"
                                            value={form.lng ?? ''}
                                            onChange={(e) => setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : undefined })}
                                            disabled={!editing}
                                            placeholder="-89.6501"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lotSize">Lot Size (sq ft)</Label>
                                        <Input
                                            id="lotSize"
                                            type="number"
                                            min="0"
                                            value={form.lotSize ?? ''}
                                            onChange={(e) => setForm({ ...form, lotSize: e.target.value ? parseInt(e.target.value) : undefined })}
                                            disabled={!editing}
                                            placeholder="10000"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.status || 'active'}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        disabled={!editing}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={form.notes || ''}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        disabled={!editing}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t text-sm text-muted-foreground flex gap-6">
                                <span>Type: {getPropertyTypeName(property.propertyTypeId)}</span>
                                <span>Created: {property.createdAt ? new Date(property.createdAt).toLocaleString() : '-'}</span>
                                <span>Updated: {property.updatedAt ? new Date(property.updatedAt).toLocaleString() : '-'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Property Measurements</CardTitle>
                            <CardDescription>
                                Detailed measurements used for service pricing and estimates.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {MEASUREMENT_FIELDS.map((field) => (
                                    <div key={field.key} className="grid gap-2">
                                        <Label htmlFor={`m-${field.key}`}>
                                            {field.label}
                                            <span className="text-xs text-muted-foreground ml-1">({field.unit})</span>
                                        </Label>
                                        <Input
                                            id={`m-${field.key}`}
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={form.measurements?.[field.key] ?? ''}
                                            onChange={(e) => setMeasurement(field.key, e.target.value)}
                                            disabled={!editing}
                                            placeholder={field.placeholder}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {editing && (
                        <div className="flex gap-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save All Changes
                            </Button>
                            <Button type="button" variant="outline" onClick={() => {
                                setEditing(false);
                                setForm({
                                    propertyTypeId: property.propertyTypeId,
                                    name: property.name,
                                    address: property.address,
                                    city: property.city,
                                    state: property.state,
                                    zip: property.zip,
                                    lat: property.lat,
                                    lng: property.lng,
                                    lotSize: property.lotSize,
                                    notes: property.notes || '',
                                    status: property.status || 'active',
                                    measurements: property.measurements || {},
                                });
                            }}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </form>

            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Assign categories to this property.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CategoryTagInput entityType="property" entityId={property.propertyId} />
                </CardContent>
            </Card>
        </div>
    );
}
