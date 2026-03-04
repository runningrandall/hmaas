'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Tag, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { categoriesApi, Category, UpdateCategoryData } from '@/lib/api/categories';
import { useAdminAuthContext } from '@/contexts/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CategoryDetailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isSuperAdmin } = useAdminAuthContext();
    const categoryId = searchParams.get('id');

    const [category, setCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState<UpdateCategoryData>({});

    const loadCategory = useCallback(async () => {
        if (!categoryId) return;
        setLoading(true);
        try {
            const data = await categoriesApi.get(categoryId);
            setCategory(data);
            setForm({
                name: data.name,
                description: data.description || '',
            });
            setError('');
        } catch {
            setError('Failed to load category.');
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => {
        if (!isSuperAdmin) {
            router.push('/admin');
            return;
        }
        if (!categoryId) {
            router.push('/admin/categories');
            return;
        }
        loadCategory();
    }, [isSuperAdmin, router, categoryId, loadCategory]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId) return;
        setSaving(true);
        setSuccess('');
        try {
            const updated = await categoriesApi.update(categoryId, form);
            setCategory(updated);
            setEditing(false);
            setSuccess('Category updated.');
            setError('');
        } catch {
            setError('Failed to update category.');
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

    if (!category) {
        return (
            <div className="space-y-4">
                <Link href="/admin/categories" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" /> Back to Categories
                </Link>
                <p className="text-muted-foreground">Category not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/categories" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Categories
                </Link>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Tag className="h-6 w-6" />
                    {category.name}
                </h1>
                <p className="text-muted-foreground">Category ID: {category.categoryId}</p>
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
                        <CardTitle>Category Details</CardTitle>
                        <CardDescription>View and edit category information.</CardDescription>
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
                                    value={form.name || ''}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    disabled={!editing}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={form.description || ''}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    disabled={!editing}
                                    rows={3}
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
                                            name: category.name,
                                            description: category.description || '',
                                        });
                                    }}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 pt-4 border-t text-sm text-muted-foreground flex gap-6">
                        <span>Created: {category.createdAt ? new Date(category.createdAt).toLocaleString() : '-'}</span>
                        <span>Updated: {category.updatedAt ? new Date(category.updatedAt).toLocaleString() : '-'}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
