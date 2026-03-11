'use client';

import { useCallback, useEffect, useState } from 'react';
import { Truck, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { subcontractorsApi, Subcontractor, CreateSubcontractorData } from '@/lib/api/subcontractors';
import { formatPhoneInput } from '@/lib/format';
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

const statusStyles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    inactive: 'bg-muted text-muted-foreground',
};

export default function SubcontractorsPage() {
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<CreateSubcontractorData>({
        name: '',
        email: '',
    });

    const loadSubcontractors = useCallback(async () => {
        setLoading(true);
        try {
            const data = await subcontractorsApi.list();
            setSubcontractors(data.items || []);
            setError('');
        } catch {
            setError('Failed to load subcontractors.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubcontractors();
    }, [loadSubcontractors]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) return;

        setCreating(true);
        try {
            await subcontractorsApi.create(form);
            setForm({ name: '', email: '' });
            setDialogOpen(false);
            await loadSubcontractors();
        } catch {
            setError('Failed to create subcontractor.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await subcontractorsApi.delete(id);
            await loadSubcontractors();
        } catch {
            setError('Failed to delete subcontractor.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="h-6 w-6" />
                        Subcontractors
                    </h1>
                    <p className="text-muted-foreground">Manage external subcontractors and their service rates.</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Subcontractor
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Add Subcontractor</DialogTitle>
                                <DialogDescription>Add an external subcontractor to your organization.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Company Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="ABC Lawn Care LLC"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="contactName">Contact Name</Label>
                                        <Input
                                            id="contactName"
                                            value={form.contactName || ''}
                                            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                                            placeholder="John Smith"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={form.phone || ''}
                                            onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                                            placeholder="303-555-0200"
                                            maxLength={12}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="contact@subcontractor.com"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={form.notes || ''}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        placeholder="Specializes in commercial properties..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating}>
                                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
                    <CardTitle>All Subcontractors</CardTitle>
                    <CardDescription>
                        {subcontractors.length} subcontractor{subcontractors.length !== 1 ? 's' : ''} registered.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : subcontractors.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No subcontractors yet. Add one to get started.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subcontractors.map((sub) => (
                                    <TableRow key={sub.subcontractorId}>
                                        <TableCell className="font-medium">{sub.name}</TableCell>
                                        <TableCell>{sub.contactName || '-'}</TableCell>
                                        <TableCell>{sub.email}</TableCell>
                                        <TableCell>{sub.phone || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[sub.status] || ''}`}>
                                                {sub.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => window.location.href = `/admin/subcontractors/detail?id=${sub.subcontractorId}`}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(sub.subcontractorId)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
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
