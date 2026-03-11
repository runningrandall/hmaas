'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Truck, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
    subcontractorsApi,
    Subcontractor,
    SubcontractorRate,
    UpdateSubcontractorData,
    SubcontractorStatus,
    CreateSubcontractorRateData,
} from '@/lib/api/subcontractors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const STATUSES: SubcontractorStatus[] = ['active', 'inactive'];

export default function SubcontractorDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const subcontractorId = searchParams.get('id');

    const [sub, setSub] = useState<Subcontractor | null>(null);
    const [rates, setRates] = useState<SubcontractorRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState<UpdateSubcontractorData>({});
    const [rateDialogOpen, setRateDialogOpen] = useState(false);
    const [creatingRate, setCreatingRate] = useState(false);
    const [rateForm, setRateForm] = useState<CreateSubcontractorRateData>({
        propertyId: '',
        serviceTypeId: '',
        rate: 0,
        unit: 'per_visit',
    });

    const loadSubcontractor = useCallback(async () => {
        if (!subcontractorId) return;
        setLoading(true);
        try {
            const [subData, ratesData] = await Promise.all([
                subcontractorsApi.get(subcontractorId),
                subcontractorsApi.listRates(subcontractorId),
            ]);
            setSub(subData);
            setRates(ratesData.items || []);
            setForm({
                name: subData.name,
                contactName: subData.contactName || '',
                email: subData.email,
                phone: subData.phone || '',
                status: subData.status,
                notes: subData.notes || '',
            });
            setError('');
        } catch {
            setError('Failed to load subcontractor.');
        } finally {
            setLoading(false);
        }
    }, [subcontractorId]);

    useEffect(() => {
        if (!subcontractorId) {
            router.push('/admin/subcontractors');
            return;
        }
        loadSubcontractor();
    }, [subcontractorId, router, loadSubcontractor]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subcontractorId) return;
        setSaving(true);
        setSuccess('');
        try {
            const updated = await subcontractorsApi.update(subcontractorId, form);
            setSub(updated);
            setEditing(false);
            setSuccess('Subcontractor updated.');
            setError('');
        } catch {
            setError('Failed to update subcontractor.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subcontractorId) return;
        setCreatingRate(true);
        try {
            await subcontractorsApi.createRate(subcontractorId, {
                ...rateForm,
                rate: Math.round(rateForm.rate * 100),
            });
            setRateForm({ propertyId: '', serviceTypeId: '', rate: 0, unit: 'per_visit' });
            setRateDialogOpen(false);
            const ratesData = await subcontractorsApi.listRates(subcontractorId);
            setRates(ratesData.items || []);
            setSuccess('Rate added.');
            setError('');
        } catch {
            setError('Failed to create rate.');
        } finally {
            setCreatingRate(false);
        }
    };

    const handleDeleteRate = async (rateId: string) => {
        if (!subcontractorId) return;
        try {
            await subcontractorsApi.deleteRate(rateId);
            const ratesData = await subcontractorsApi.listRates(subcontractorId);
            setRates(ratesData.items || []);
        } catch {
            setError('Failed to delete rate.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!sub) {
        return (
            <div className="space-y-4">
                <Link href="/admin/subcontractors" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Subcontractors
                </Link>
                <p className="text-muted-foreground">Subcontractor not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/subcontractors" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Subcontractors
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Truck className="h-6 w-6" />
                    {sub.name}
                </h1>
                <p className="text-muted-foreground">Subcontractor ID: {sub.subcontractorId}</p>
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
                        <CardTitle>Subcontractor Details</CardTitle>
                        <CardDescription>View and edit subcontractor information.</CardDescription>
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
                                    <Label htmlFor="name">Company Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name || ''}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="contactName">Contact Name</Label>
                                    <Input
                                        id="contactName"
                                        value={form.contactName || ''}
                                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.email || ''}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        value={form.status || 'active'}
                                        onChange={(e) => setForm({ ...form, status: e.target.value as SubcontractorStatus })}
                                        disabled={!editing}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {STATUSES.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={form.notes || ''}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    disabled={!editing}
                                    rows={2}
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
                                            name: sub.name,
                                            contactName: sub.contactName || '',
                                            email: sub.email,
                                            phone: sub.phone || '',
                                            status: sub.status,
                                            notes: sub.notes || '',
                                        });
                                    }}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 pt-4 border-t text-sm text-muted-foreground flex gap-6">
                        <span>Created: {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '-'}</span>
                        <span>Updated: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : '-'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Contracted Rates</CardTitle>
                        <CardDescription>Rates for services at specific properties.</CardDescription>
                    </div>
                    <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Rate
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleCreateRate}>
                                <DialogHeader>
                                    <DialogTitle>Add Contracted Rate</DialogTitle>
                                    <DialogDescription>Set a rate for a service at a specific property.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="propertyId">Property ID</Label>
                                        <Input
                                            id="propertyId"
                                            value={rateForm.propertyId}
                                            onChange={(e) => setRateForm({ ...rateForm, propertyId: e.target.value })}
                                            placeholder="prop-abc-123"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="serviceTypeId">Service Type ID</Label>
                                        <Input
                                            id="serviceTypeId"
                                            value={rateForm.serviceTypeId}
                                            onChange={(e) => setRateForm({ ...rateForm, serviceTypeId: e.target.value })}
                                            placeholder="svc-type-456"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="rate">Rate ($)</Label>
                                            <Input
                                                id="rate"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={rateForm.rate}
                                                onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="unit">Unit</Label>
                                            <select
                                                id="unit"
                                                value={rateForm.unit}
                                                onChange={(e) => setRateForm({ ...rateForm, unit: e.target.value })}
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                            >
                                                <option value="per_visit">Per Visit</option>
                                                <option value="per_hour">Per Hour</option>
                                                <option value="per_sqft">Per Sq Ft</option>
                                                <option value="flat_rate">Flat Rate</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="effectiveDate">Effective Date</Label>
                                        <Input
                                            id="effectiveDate"
                                            type="date"
                                            value={rateForm.effectiveDate || ''}
                                            onChange={(e) => setRateForm({ ...rateForm, effectiveDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rateNotes">Notes</Label>
                                        <Input
                                            id="rateNotes"
                                            value={rateForm.notes || ''}
                                            onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                                            placeholder="Negotiated rate for 2026 season"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={creatingRate}>
                                        {creatingRate && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Add Rate
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {rates.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No contracted rates yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property ID</TableHead>
                                    <TableHead>Service Type ID</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Effective Date</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rates.map((rate) => (
                                    <TableRow key={rate.subcontractorRateId}>
                                        <TableCell className="font-mono text-xs">{rate.propertyId}</TableCell>
                                        <TableCell className="font-mono text-xs">{rate.serviceTypeId}</TableCell>
                                        <TableCell>${(rate.rate / 100).toFixed(2)}</TableCell>
                                        <TableCell>{rate.unit.replace('_', ' ')}</TableCell>
                                        <TableCell>{rate.effectiveDate || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{rate.notes || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteRate(rate.subcontractorRateId)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
