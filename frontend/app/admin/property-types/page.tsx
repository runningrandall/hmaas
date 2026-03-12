'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { propertyTypesApi, PropertyType, CreatePropertyTypeData } from '@/lib/api/property-types';
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

export default function PropertyTypesPage() {
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<CreatePropertyTypeData>({
        name: '',
    });

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        loadPropertyTypes();
    }, [isSuperAdmin, router]);

    const loadPropertyTypes = async () => {
        setLoading(true);
        try {
            const data = await propertyTypesApi.list();
            setPropertyTypes(data.items || []);
            setError('');
        } catch {
            setError('Failed to load property types.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setCreating(true);
        try {
            await propertyTypesApi.create(form);
            setForm({ name: '' });
            setDialogOpen(false);
            await loadPropertyTypes();
        } catch {
            setError('Failed to create property type.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this property type? This cannot be undone.')) return;
        try {
            await propertyTypesApi.delete(id);
            await loadPropertyTypes();
        } catch {
            setError('Failed to delete property type.');
        }
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="h-6 w-6" />
                        Property Type Management
                    </h1>
                    <p className="text-muted-foreground">Manage property types available on the platform.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Property Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Property Type</DialogTitle>
                                <DialogDescription>Add a new property type to the platform.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Residential"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description || ''}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Brief description of the property type"
                                        rows={2}
                                    />
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
                        <CardTitle className="text-sm font-medium">Property Types</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{propertyTypes.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Property Types</CardTitle>
                    <CardDescription>View and manage property types.</CardDescription>
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
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {propertyTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No property types found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    propertyTypes.map((pt) => (
                                        <TableRow key={pt.propertyTypeId}>
                                            <TableCell className="font-medium">{pt.name}</TableCell>
                                            <TableCell className="max-w-xs truncate">{pt.description || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={pt.status === 'active' ? 'default' : 'secondary'}>
                                                    {pt.status || 'active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/property-types/detail?id=${pt.propertyTypeId}`)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(pt.propertyTypeId)}
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
