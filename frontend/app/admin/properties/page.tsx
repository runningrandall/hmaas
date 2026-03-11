'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { propertiesApi, Property, CreatePropertyData } from '@/lib/api/properties';
import { customersApi, Customer } from '@/lib/api/customers';
import { propertyTypesApi, PropertyType } from '@/lib/api/property-types';
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

export default function PropertiesPage() {
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<CreatePropertyData>({
        propertyTypeId: '',
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
    });

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        loadInitialData();
    }, [isSuperAdmin, router]);

    const loadInitialData = async () => {
        setInitialLoading(true);
        try {
            const [custData, ptData] = await Promise.all([
                customersApi.list(),
                propertyTypesApi.list(),
            ]);
            setCustomers(custData.items || []);
            setPropertyTypes(ptData.items || []);
            setError('');
        } catch {
            setError('Failed to load data.');
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCustomerId) {
            loadProperties(selectedCustomerId);
        } else {
            setProperties([]);
        }
    }, [selectedCustomerId]);

    const loadProperties = async (customerId: string) => {
        setLoading(true);
        try {
            const data = await propertiesApi.listByCustomer(customerId);
            setProperties(data.items || []);
            setError('');
        } catch {
            setError('Failed to load properties.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId || !form.name.trim() || !form.propertyTypeId) return;

        setCreating(true);
        try {
            await propertiesApi.create(selectedCustomerId, form);
            setForm({ propertyTypeId: '', name: '', address: '', city: '', state: '', zip: '' });
            setDialogOpen(false);
            await loadProperties(selectedCustomerId);
        } catch {
            setError('Failed to create property.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) return;
        try {
            await propertiesApi.delete(id);
            if (selectedCustomerId) await loadProperties(selectedCustomerId);
        } catch {
            setError('Failed to delete property.');
        }
    };

    const getCustomerName = (customerId: string) => {
        const c = customers.find((c) => c.customerId === customerId);
        return c ? `${c.firstName} ${c.lastName}` : customerId;
    };

    const getPropertyTypeName = (propertyTypeId: string) => {
        const pt = propertyTypes.find((p) => p.propertyTypeId === propertyTypeId);
        return pt?.name || propertyTypeId;
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="h-6 w-6" />
                        Properties
                    </h1>
                    <p className="text-muted-foreground">Manage customer properties and their details.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!selectedCustomerId}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Property
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Property</DialogTitle>
                                <DialogDescription>
                                    Add a new property for {selectedCustomerId ? getCustomerName(selectedCustomerId) : 'selected customer'}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="propertyTypeId">Property Type</Label>
                                    <select
                                        id="propertyTypeId"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.propertyTypeId}
                                        onChange={(e) => setForm({ ...form, propertyTypeId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select property type</option>
                                        {propertyTypes.map((pt) => (
                                            <option key={pt.propertyTypeId} value={pt.propertyTypeId}>
                                                {pt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Property Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Main Residence"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        placeholder="123 Main St"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                            placeholder="Springfield"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={form.state}
                                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                                            placeholder="IL"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="zip">ZIP</Label>
                                        <Input
                                            id="zip"
                                            value={form.zip}
                                            onChange={(e) => setForm({ ...form, zip: e.target.value })}
                                            placeholder="62701"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={form.notes || ''}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        placeholder="Any additional notes about this property"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating || !form.name.trim() || !form.propertyTypeId}>
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

            <Card>
                <CardHeader>
                    <CardTitle>Select Customer</CardTitle>
                    <CardDescription>Choose a customer to view and manage their properties.</CardDescription>
                </CardHeader>
                <CardContent>
                    {initialLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="">Select a customer...</option>
                            {customers.map((c) => (
                                <option key={c.customerId} value={c.customerId}>
                                    {c.firstName} {c.lastName} ({c.email})
                                </option>
                            ))}
                        </select>
                    )}
                </CardContent>
            </Card>

            {selectedCustomerId && (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Properties</CardTitle>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{properties.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Properties for {getCustomerName(selectedCustomerId)}</CardTitle>
                            <CardDescription>View and manage properties for this customer.</CardDescription>
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
                                            <TableHead>Type</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {properties.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No properties found for this customer. Create one to get started.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            properties.map((p) => (
                                                <TableRow key={p.propertyId}>
                                                    <TableCell className="font-medium">{p.name}</TableCell>
                                                    <TableCell>{getPropertyTypeName(p.propertyTypeId)}</TableCell>
                                                    <TableCell className="max-w-xs truncate">
                                                        {p.address}, {p.city}, {p.state} {p.zip}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={p.status === 'active' || !p.status ? 'default' : 'secondary'}>
                                                            {p.status || 'active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => router.push(`/admin/properties/detail?id=${p.propertyId}`)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(p.propertyId)}
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
                </>
            )}
        </div>
    );
}
