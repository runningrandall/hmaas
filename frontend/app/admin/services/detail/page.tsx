'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { serviceTypesApi, ServiceType, UpdateServiceTypeData, ServiceUnit, ServiceFrequency, SERVICE_UNIT_LABELS, SERVICE_FREQUENCY_LABELS } from '@/lib/api/service-types';
import CategoryTagInput from '@/components/CategoryTagInput';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ServiceTypeDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const serviceTypeId = searchParams.get('id');

    const [serviceType, setServiceType] = useState<ServiceType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState<UpdateServiceTypeData & { basePriceDollars: string; ratePerUnitDollars: string }>({ basePriceDollars: '', ratePerUnitDollars: '' });

    const loadServiceType = useCallback(async () => {
        if (!serviceTypeId) return;
        setLoading(true);
        try {
            const data = await serviceTypesApi.get(serviceTypeId);
            setServiceType(data);
            setForm({
                name: data.name,
                description: data.description || '',
                basePriceDollars: data.basePrice != null ? (data.basePrice / 100).toFixed(2) : '',
                unit: data.unit,
                estimatedDuration: data.estimatedDuration,
                frequency: data.frequency,
                measurementKey: data.measurementKey || '',
                measurementUnit: data.measurementUnit || '',
                ratePerUnitDollars: data.ratePerUnit != null ? (data.ratePerUnit / 100).toFixed(2) : '',
                durationPerUnit: data.durationPerUnit,
            });
            setError('');
        } catch {
            setError('Failed to load service type.');
        } finally {
            setLoading(false);
        }
    }, [serviceTypeId]);

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        if (!serviceTypeId) {
            router.push('/admin/services');
            return;
        }
        loadServiceType();
    }, [isSuperAdmin, router, serviceTypeId, loadServiceType]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceTypeId) return;
        setSaving(true);
        setSuccess('');
        try {
            const { basePriceDollars, ratePerUnitDollars, ...rest } = form;
            const data: UpdateServiceTypeData = {
                ...rest,
                basePrice: basePriceDollars ? Math.round(parseFloat(basePriceDollars) * 100) : undefined,
                ratePerUnit: ratePerUnitDollars ? Math.round(parseFloat(ratePerUnitDollars) * 100) : undefined,
            };
            const updated = await serviceTypesApi.update(serviceTypeId, data);
            setServiceType(updated);
            setEditing(false);
            setSuccess('Service type updated.');
            setError('');
        } catch {
            setError('Failed to update service type.');
        } finally {
            setSaving(false);
        }
    };

    if (!isSuperAdmin) return null;

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!serviceType) {
        return (
            <div className="space-y-4">
                <Link href="/admin/services" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Service Types
                </Link>
                <p className="text-muted-foreground">Service type not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/services" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Service Types
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Wrench className="h-6 w-6" />
                    {serviceType.name}
                </h1>
                <p className="text-muted-foreground">Service Type ID: {serviceType.serviceTypeId}</p>
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Service Type Details</CardTitle>
                        <CardDescription>View and edit service type information.</CardDescription>
                    </div>
                    {!editing && (
                        <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                    )}
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={form.name || ''}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    disabled={!editing}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={form.description || ''}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    disabled={!editing}
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="basePrice">Base Price ($)</Label>
                                    <Input
                                        id="basePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.basePriceDollars}
                                        onChange={(e) => setForm({ ...form, basePriceDollars: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="unit">Unit</Label>
                                    <select
                                        id="unit"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.unit || ''}
                                        onChange={(e) => setForm({ ...form, unit: (e.target.value || undefined) as ServiceUnit | undefined })}
                                        disabled={!editing}
                                    >
                                        <option value="">Select unit</option>
                                        {Object.entries(SERVICE_UNIT_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="estimatedDuration">Est. Duration (min)</Label>
                                    <Input
                                        id="estimatedDuration"
                                        type="number"
                                        min="1"
                                        value={form.estimatedDuration || ''}
                                        onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value ? parseInt(e.target.value) : undefined })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="frequency">Frequency</Label>
                                    <select
                                        id="frequency"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.frequency || ''}
                                        onChange={(e) => setForm({ ...form, frequency: (e.target.value || undefined) as ServiceFrequency | undefined })}
                                        disabled={!editing}
                                    >
                                        <option value="">Select frequency</option>
                                        {Object.entries(SERVICE_FREQUENCY_LABELS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="measurementKey">Measurement Key</Label>
                                    <Input
                                        id="measurementKey"
                                        value={form.measurementKey || ''}
                                        onChange={(e) => setForm({ ...form, measurementKey: e.target.value || undefined })}
                                        disabled={!editing}
                                        placeholder="e.g. lawnSqft, windowCount"
                                    />
                                    <p className="text-xs text-muted-foreground">Property measurement field used for pricing calculations</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="measurementUnit">Measurement Unit</Label>
                                    <Input
                                        id="measurementUnit"
                                        value={form.measurementUnit || ''}
                                        onChange={(e) => setForm({ ...form, measurementUnit: e.target.value || undefined })}
                                        disabled={!editing}
                                        placeholder="e.g. sq ft, count, linear ft"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="ratePerUnit">Rate Per Unit ($)</Label>
                                    <Input
                                        id="ratePerUnit"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.ratePerUnitDollars}
                                        onChange={(e) => setForm({ ...form, ratePerUnitDollars: e.target.value })}
                                        disabled={!editing}
                                        placeholder="0.05"
                                    />
                                    <p className="text-xs text-muted-foreground">Added to base price per unit of measurement</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="durationPerUnit">Duration Per Unit (min)</Label>
                                    <Input
                                        id="durationPerUnit"
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={form.durationPerUnit || ''}
                                        onChange={(e) => setForm({ ...form, durationPerUnit: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        disabled={!editing}
                                        placeholder="0.5"
                                    />
                                    <p className="text-xs text-muted-foreground">Added to base duration per unit of measurement</p>
                                </div>
                            </div>
                            {editing && (
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => {
                                        setEditing(false);
                                        setForm({
                                            name: serviceType.name,
                                            description: serviceType.description || '',
                                            basePriceDollars: serviceType.basePrice != null ? (serviceType.basePrice / 100).toFixed(2) : '',
                                            unit: serviceType.unit,
                                            estimatedDuration: serviceType.estimatedDuration,
                                            frequency: serviceType.frequency,
                                            measurementKey: serviceType.measurementKey || '',
                                            measurementUnit: serviceType.measurementUnit || '',
                                            ratePerUnitDollars: serviceType.ratePerUnit != null ? (serviceType.ratePerUnit / 100).toFixed(2) : '',
                                            durationPerUnit: serviceType.durationPerUnit,
                                        });
                                    }}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 pt-4 border-t text-sm text-muted-foreground flex gap-6">
                        <span>Created: {serviceType.createdAt ? new Date(serviceType.createdAt).toLocaleString() : '-'}</span>
                        <span>Updated: {serviceType.updatedAt ? new Date(serviceType.updatedAt).toLocaleString() : '-'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Assign categories to this service type.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CategoryTagInput entityType="serviceType" entityId={serviceType.serviceTypeId} />
                </CardContent>
            </Card>
        </div>
    );
}
