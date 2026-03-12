'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Loader2, Trash2, Pencil, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { propertiesApi, Property, CreatePropertyData } from '@/lib/api/properties';
import { formatStateInput } from '@/lib/format';
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
    const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

    // Customer search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

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
            const ptData = await propertyTypesApi.list();
            setPropertyTypes(ptData.items || []);
            setError('');
        } catch {
            setError('Failed to load data.');
        } finally {
            setInitialLoading(false);
        }
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!value.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const data = await customersApi.list(value.trim());
                setSearchResults(data.items || []);
                setShowResults(true);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const selectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSearchQuery(`${customer.firstName} ${customer.lastName}`);
        setShowResults(false);
        loadProperties(customer.customerId);
    };

    const clearCustomer = () => {
        setSelectedCustomer(null);
        setSearchQuery('');
        setProperties([]);
        setSearchResults([]);
    };

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
        if (!selectedCustomer || !form.name.trim() || !form.propertyTypeId) return;

        setCreating(true);
        try {
            await propertiesApi.create(selectedCustomer.customerId, form);
            setForm({ propertyTypeId: '', name: '', address: '', city: '', state: '', zip: '' });
            setDialogOpen(false);
            await loadProperties(selectedCustomer.customerId);
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
            if (selectedCustomer) await loadProperties(selectedCustomer.customerId);
        } catch {
            setError('Failed to delete property.');
        }
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
                        <Button disabled={!selectedCustomer}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Property
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Property</DialogTitle>
                                <DialogDescription>
                                    Add a new property for {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'selected customer'}.
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
                                            onChange={(e) => setForm({ ...form, state: formatStateInput(e.target.value) })}
                                            placeholder="IL"
                                            maxLength={2}
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
                    <CardTitle>Find Customer</CardTitle>
                    <CardDescription>Search by name, email, or phone to view their properties.</CardDescription>
                </CardHeader>
                <CardContent>
                    {initialLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="relative" ref={searchRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search customers by name, email, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    onFocus={() => { if (searchResults.length > 0 && !selectedCustomer) setShowResults(true); }}
                                    className="pl-9"
                                />
                                {searching && (
                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                                    {searchResults.map((c) => (
                                        <button
                                            key={c.customerId}
                                            type="button"
                                            className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent text-left"
                                            onClick={() => selectCustomer(c)}
                                        >
                                            <div>
                                                <span className="font-medium">{c.firstName} {c.lastName}</span>
                                                <span className="text-muted-foreground ml-2">{c.email}</span>
                                                {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {showResults && searchResults.length === 0 && searchQuery.trim() && !searching && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg px-3 py-2 text-sm text-muted-foreground">
                                    No customers found.
                                </div>
                            )}
                            {selectedCustomer && (
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {selectedCustomer.firstName} {selectedCustomer.lastName} - {selectedCustomer.email}
                                    </Badge>
                                    <Button variant="ghost" size="sm" onClick={clearCustomer}>
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedCustomer && (
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
                            <CardTitle>Properties for {selectedCustomer.firstName} {selectedCustomer.lastName}</CardTitle>
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
