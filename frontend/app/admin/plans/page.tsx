'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { plansApi, Plan, CreatePlanData } from '@/lib/api/plans';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

export default function PlansPage() {
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        monthlyPrice: '',
        annualPrice: '',
    });

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        loadPlans();
    }, [isSuperAdmin, router]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await plansApi.list();
            setPlans(data.items || []);
            setError('');
        } catch {
            setError('Failed to load plans.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.monthlyPrice) return;

        setCreating(true);
        try {
            const data: CreatePlanData = {
                name: form.name,
                description: form.description || undefined,
                monthlyPrice: Math.round(parseFloat(form.monthlyPrice) * 100),
                annualPrice: form.annualPrice ? Math.round(parseFloat(form.annualPrice) * 100) : undefined,
            };
            await plansApi.create(data);
            setForm({ name: '', description: '', monthlyPrice: '', annualPrice: '' });
            setDialogOpen(false);
            await loadPlans();
        } catch {
            setError('Failed to create plan.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this plan? This cannot be undone.')) return;
        try {
            await plansApi.delete(id);
            await loadPlans();
        } catch {
            setError('Failed to delete plan.');
        }
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Plan Management
                    </h1>
                    <p className="text-muted-foreground">Create and manage service plans and pricing.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Plan</DialogTitle>
                                <DialogDescription>Add a new service plan.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Basic Plan"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Brief description of the plan"
                                        rows={2}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
                                    <Input
                                        id="monthlyPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.monthlyPrice}
                                        onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                                        placeholder="29.99"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="annualPrice">Annual Price ($)</Label>
                                    <Input
                                        id="annualPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.annualPrice}
                                        onChange={(e) => setForm({ ...form, annualPrice: e.target.value })}
                                        placeholder="299.99"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={creating || !form.name.trim() || !form.monthlyPrice}>
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
                        <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plans.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Plans</CardTitle>
                    <CardDescription>View and manage plans.</CardDescription>
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
                                    <TableHead>Monthly Price</TableHead>
                                    <TableHead>Annual Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No plans found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    plans.map((plan) => (
                                        <TableRow key={plan.planId}>
                                            <TableCell className="font-medium">{plan.name}</TableCell>
                                            <TableCell>{formatCents(plan.monthlyPrice)}</TableCell>
                                            <TableCell>{plan.annualPrice ? formatCents(plan.annualPrice) : '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                                                    {plan.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/admin/plans/detail?id=${plan.planId}`)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(plan.planId)}
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
