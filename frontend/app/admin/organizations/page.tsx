'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { organizationsApi, Organization, CreateOrganizationData } from '@/lib/api/organizations';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
};

export default function OrganizationsPage() {
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<CreateOrganizationData>({
        name: '',
        slug: '',
        ownerUserId: '',
        billingEmail: '',
    });

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        loadOrganizations();
    }, [isSuperAdmin, router]);

    const loadOrganizations = async () => {
        setLoading(true);
        try {
            const data = await organizationsApi.list();
            setOrganizations(data.items || []);
            setError('');
        } catch {
            setError('Failed to load organizations.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.slug.trim() || !form.ownerUserId.trim() || !form.billingEmail.trim()) return;

        setCreating(true);
        try {
            await organizationsApi.create(form);
            setForm({ name: '', slug: '', ownerUserId: '', billingEmail: '' });
            setDialogOpen(false);
            await loadOrganizations();
        } catch {
            setError('Failed to create organization.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this organization? This cannot be undone.')) return;
        try {
            await organizationsApi.delete(id);
            await loadOrganizations();
        } catch {
            setError('Failed to delete organization.');
        }
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Globe className="h-6 w-6" />
                        Organization Management
                    </h1>
                    <p className="text-muted-foreground">Manage tenant organizations on the platform.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Organization
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Organization</DialogTitle>
                                <DialogDescription>Add a new tenant organization to the platform.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Acme Property Management"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">Slug</Label>
                                    <Input
                                        id="slug"
                                        value={form.slug}
                                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                        placeholder="acme-pm"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ownerUserId">Owner User ID</Label>
                                    <Input
                                        id="ownerUserId"
                                        value={form.ownerUserId}
                                        onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
                                        placeholder="cognito-user-id"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="billingEmail">Billing Email</Label>
                                    <Input
                                        id="billingEmail"
                                        type="email"
                                        value={form.billingEmail}
                                        onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
                                        placeholder="billing@acme.com"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={form.city || ''}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={form.state || ''}
                                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="zip">Zip</Label>
                                    <Input
                                        id="zip"
                                        value={form.zip || ''}
                                        onChange={(e) => setForm({ ...form, zip: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating || !form.name.trim() || !form.slug.trim() || !form.ownerUserId.trim() || !form.billingEmail.trim()}>
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
                        <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{organizations.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>View and manage tenant organizations.</CardDescription>
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
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Billing Email</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No organizations found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    organizations.map((org) => (
                                        <TableRow key={org.organizationId}>
                                            <TableCell className="font-medium">{org.name}</TableCell>
                                            <TableCell>{org.slug}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusStyles[org.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {org.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{org.billingEmail}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/organizations/detail?id=${org.organizationId}`)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(org.organizationId)}
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
