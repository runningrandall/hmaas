'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { plansApi, Plan, UpdatePlanData } from '@/lib/api/plans';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CategoryTagInput from '@/components/CategoryTagInput';

export default function PlanDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const planId = searchParams.get('id');

    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        name: '',
        description: '',
        monthlyPrice: '',
        annualPrice: '',
        status: 'active' as 'active' | 'inactive',
    });

    const loadPlan = useCallback(async () => {
        if (!planId) return;
        setLoading(true);
        try {
            const data = await plansApi.get(planId);
            setPlan(data);
            setForm({
                name: data.name,
                description: data.description || '',
                monthlyPrice: (data.monthlyPrice / 100).toFixed(2),
                annualPrice: data.annualPrice ? (data.annualPrice / 100).toFixed(2) : '',
                status: data.status,
            });
            setError('');
        } catch {
            setError('Failed to load plan.');
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        if (!planId) {
            router.push('/admin/plans');
            return;
        }
        loadPlan();
    }, [isSuperAdmin, router, planId, loadPlan]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planId) return;
        setSaving(true);
        setSuccess('');
        try {
            const data: UpdatePlanData = {
                name: form.name,
                description: form.description || undefined,
                monthlyPrice: Math.round(parseFloat(form.monthlyPrice) * 100),
                annualPrice: form.annualPrice ? Math.round(parseFloat(form.annualPrice) * 100) : undefined,
                status: form.status,
            };
            const updated = await plansApi.update(planId, data);
            setPlan(updated);
            setEditing(false);
            setSuccess('Plan updated.');
            setError('');
        } catch {
            setError('Failed to update plan.');
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

    if (!plan) {
        return (
            <div className="space-y-4">
                <Link href="/admin/plans" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Plans
                </Link>
                <p className="text-muted-foreground">Plan not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/plans" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Plans
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        {plan.name}
                    </h1>
                    <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                        {plan.status}
                    </Badge>
                </div>
                <p className="text-muted-foreground">Plan ID: {plan.planId}</p>
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
                        <CardTitle>Plan Details</CardTitle>
                        <CardDescription>View and edit plan information.</CardDescription>
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
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    disabled={!editing}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    disabled={!editing}
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
                                    <Input
                                        id="monthlyPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.monthlyPrice}
                                        onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                                        disabled={!editing}
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
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                                    disabled={!editing}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
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
                                            name: plan.name,
                                            description: plan.description || '',
                                            monthlyPrice: (plan.monthlyPrice / 100).toFixed(2),
                                            annualPrice: plan.annualPrice ? (plan.annualPrice / 100).toFixed(2) : '',
                                            status: plan.status,
                                        });
                                    }}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 pt-4 border-t text-sm text-muted-foreground flex gap-6">
                        <span>Created: {plan.createdAt ? new Date(plan.createdAt).toLocaleString() : '-'}</span>
                        <span>Updated: {plan.updatedAt ? new Date(plan.updatedAt).toLocaleString() : '-'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Assign categories to this plan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CategoryTagInput entityType="plan" entityId={plan.planId} />
                </CardContent>
            </Card>
        </div>
    );
}
