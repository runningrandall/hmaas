'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { serviceTypesApi, ServiceType, CreateServiceTypeData, ServiceUnit, ServiceFrequency } from '@/lib/api/service-types';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
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

export default function ServicesPage() {
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<CreateServiceTypeData & { basePriceDollars: string }>({
        name: '',
        basePriceDollars: '',
    });

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        loadServiceTypes();
    }, [isSuperAdmin, router]);

    const loadServiceTypes = async () => {
        setLoading(true);
        try {
            const data = await serviceTypesApi.list();
            setServiceTypes(data.items || []);
            setError('');
        } catch {
            setError('Failed to load service types.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setCreating(true);
        try {
            const { basePriceDollars, ...rest } = form;
            const createData: CreateServiceTypeData = {
                ...rest,
                ...(basePriceDollars ? { basePrice: Math.round(parseFloat(basePriceDollars) * 100) } : {}),
            };
            await serviceTypesApi.create(createData);
            setForm({ name: '', basePriceDollars: '' });
            setDialogOpen(false);
            await loadServiceTypes();
        } catch {
            setError('Failed to create service type.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service type? This cannot be undone.')) return;
        try {
            await serviceTypesApi.delete(id);
            await loadServiceTypes();
        } catch {
            setError('Failed to delete service type.');
        }
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Wrench className="h-6 w-6" />
                        Service Type Management
                    </h1>
                    <p className="text-muted-foreground">Manage service types available on the platform.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Service Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Service Type</DialogTitle>
                                <DialogDescription>Add a new service type to the platform.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Lawn Care"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description || ''}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Brief description of the service type"
                                        rows={2}
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
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="unit">Unit</Label>
                                        <select
                                            id="unit"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.unit || ''}
                                            onChange={(e) => setForm({ ...form, unit: (e.target.value || undefined) as ServiceUnit | undefined })}
                                        >
                                            <option value="">Select unit</option>
                                            <option value="per_visit">Per Visit</option>
                                            <option value="per_hour">Per Hour</option>
                                            <option value="per_sqft">Per Sq Ft</option>
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
                                            placeholder="60"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="frequency">Frequency</Label>
                                        <select
                                            id="frequency"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.frequency || ''}
                                            onChange={(e) => setForm({ ...form, frequency: (e.target.value || undefined) as ServiceFrequency | undefined })}
                                        >
                                            <option value="">Select frequency</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="biweekly">Biweekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="annually">Annually</option>
                                            <option value="one_time">One Time</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating || !form.name.trim()}>
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Create
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Service Types</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{serviceTypes.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Service Types</CardTitle>
                    <CardDescription>View and manage service types.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Base Price</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {serviceTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No service types found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    serviceTypes.map((st) => (
                                        <TableRow key={st.serviceTypeId}>
                                            <TableCell className="font-medium">{st.name}</TableCell>
                                            <TableCell className="max-w-xs truncate">{st.description || '-'}</TableCell>
                                            <TableCell>{st.basePrice != null ? `$${(st.basePrice / 100).toFixed(2)}` : '-'}</TableCell>
                                            <TableCell>{st.estimatedDuration ? `${st.estimatedDuration} min` : '-'}</TableCell>
                                            <TableCell>{st.frequency ? st.frequency.replace('_', ' ') : '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/services/detail?id=${st.serviceTypeId}`)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(st.serviceTypeId)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
