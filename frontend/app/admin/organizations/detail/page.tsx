'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { organizationsApi, Organization, OrganizationConfig, UpdateOrganizationData, OrganizationStatus } from '@/lib/api/organizations';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ORG_STATUSES: OrganizationStatus[] = ['active', 'inactive', 'suspended'];

export default function OrganizationDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const organizationId = searchParams.get('id');

    const [org, setOrg] = useState<Organization | null>(null);
    const [config, setConfig] = useState<OrganizationConfig>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState<UpdateOrganizationData>({});

    const loadOrganization = useCallback(async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            const [orgData, configData] = await Promise.all([
                organizationsApi.get(organizationId),
                organizationsApi.getConfig(organizationId).catch(() => ({})),
            ]);
            setOrg(orgData);
            setConfig(configData);
            setForm({
                name: orgData.name,
                slug: orgData.slug,
                status: orgData.status,
                ownerUserId: orgData.ownerUserId,
                billingEmail: orgData.billingEmail,
                phone: orgData.phone || '',
                address: orgData.address || '',
                city: orgData.city || '',
                state: orgData.state || '',
                zip: orgData.zip || '',
                timezone: orgData.timezone || '',
            });
            setError('');
        } catch {
            setError('Failed to load organization.');
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        if (!organizationId) {
            router.push('/admin/organizations');
            return;
        }
        loadOrganization();
    }, [isSuperAdmin, router, organizationId, loadOrganization]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId) return;
        setSaving(true);
        setSuccess('');
        try {
            const updated = await organizationsApi.update(organizationId, form);
            setOrg(updated);
            setEditing(false);
            setSuccess('Organization updated.');
            setError('');
        } catch {
            setError('Failed to update organization.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId) return;
        setSavingConfig(true);
        setSuccess('');
        try {
            const updated = await organizationsApi.updateConfig(organizationId, config);
            setConfig(updated);
            setSuccess('Configuration updated.');
            setError('');
        } catch {
            setError('Failed to update configuration.');
        } finally {
            setSavingConfig(false);
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

    if (!org) {
        return (
            <div className="space-y-4">
                <Link href="/admin/organizations" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Organizations
                </Link>
                <p className="text-muted-foreground">Organization not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/organizations" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Organizations
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Globe className="h-6 w-6" />
                    {org.name}
                </h1>
                <p className="text-muted-foreground">Organization ID: {org.organizationId}</p>
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
                        <CardTitle>Organization Details</CardTitle>
                        <CardDescription>View and edit organization information.</CardDescription>
                    </div>
                    {!editing && (
                        <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                    )}
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave}>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
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
                                    <Label htmlFor="slug">Slug</Label>
                                    <Input
                                        id="slug"
                                        value={form.slug || ''}
                                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        value={form.status || 'active'}
                                        onChange={(e) => setForm({ ...form, status: e.target.value as OrganizationStatus })}
                                        disabled={!editing}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {ORG_STATUSES.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ownerUserId">Owner User ID</Label>
                                    <Input
                                        id="ownerUserId"
                                        value={form.ownerUserId || ''}
                                        onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="billingEmail">Billing Email</Label>
                                    <Input
                                        id="billingEmail"
                                        type="email"
                                        value={form.billingEmail || ''}
                                        onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={form.phone || ''}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        disabled={!editing}
                                    />
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
                                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="zip">Zip</Label>
                                    <Input
                                        id="zip"
                                        value={form.zip || ''}
                                        onChange={(e) => setForm({ ...form, zip: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="timezone">Timezone</Label>
                                <Input
                                    id="timezone"
                                    value={form.timezone || ''}
                                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                    disabled={!editing}
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
                                            name: org.name,
                                            slug: org.slug,
                                            status: org.status,
                                            ownerUserId: org.ownerUserId,
                                            billingEmail: org.billingEmail,
                                            phone: org.phone || '',
                                            address: org.address || '',
                                            city: org.city || '',
                                            state: org.state || '',
                                            zip: org.zip || '',
                                            timezone: org.timezone || '',
                                        });
                                    }}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Organization Config</CardTitle>
                    <CardDescription>Brand and platform configuration for this organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveConfig}>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="brandColor">Brand Color</Label>
                                    <Input
                                        id="brandColor"
                                        value={config.brandColor || ''}
                                        onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
                                        placeholder="#3b82f6"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="logoUrl">Logo URL</Label>
                                    <Input
                                        id="logoUrl"
                                        value={config.logoUrl || ''}
                                        onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="invoiceDayOfMonth">Invoice Day of Month</Label>
                                    <Input
                                        id="invoiceDayOfMonth"
                                        type="number"
                                        min={1}
                                        max={28}
                                        value={config.invoiceDayOfMonth || ''}
                                        onChange={(e) => setConfig({ ...config, invoiceDayOfMonth: e.target.value ? Number(e.target.value) : undefined })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="defaultPlanId">Default Plan ID</Label>
                                    <Input
                                        id="defaultPlanId"
                                        value={config.defaultPlanId || ''}
                                        onChange={(e) => setConfig({ ...config, defaultPlanId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Button type="submit" disabled={savingConfig}>
                                    {savingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Config
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
