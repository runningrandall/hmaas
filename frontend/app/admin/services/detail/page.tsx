'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wrench, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { serviceTypesApi, ServiceType, UpdateServiceTypeData } from '@/lib/api/service-types';
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
    const [form, setForm] = useState<UpdateServiceTypeData>({});

    const loadServiceType = useCallback(async () => {
        if (!serviceTypeId) return;
        setLoading(true);
        try {
            const data = await serviceTypesApi.get(serviceTypeId);
            setServiceType(data);
            setForm({
                name: data.name,
                description: data.description || '',
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
            const updated = await serviceTypesApi.update(serviceTypeId, form);
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
                <div className="bg-green-50 text-green-700 p-3 rounded-md border border-green-200 text-sm">
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
