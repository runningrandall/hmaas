'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    categoriesApi,
    serviceTypeCategoriesApi,
    planCategoriesApi,
    propertyCategoriesApi,
    Category,
} from '@/lib/api/categories';

type EntityType = 'serviceType' | 'plan' | 'property';

interface CategoryTagInputProps {
    entityType: EntityType;
    entityId: string;
    disabled?: boolean;
}

function getApi(entityType: EntityType) {
    if (entityType === 'serviceType') return serviceTypeCategoriesApi;
    if (entityType === 'property') return propertyCategoriesApi;
    return planCategoriesApi;
}

export default function CategoryTagInput({ entityType, entityId, disabled }: CategoryTagInputProps) {
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [assignedCategoryIds, setAssignedCategoryIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    const api = getApi(entityType);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [cats, assigned] = await Promise.all([
                categoriesApi.list(),
                api.list(entityId),
            ]);
            setAllCategories(cats.items || []);
            setAssignedCategoryIds((assigned.items || []).map((ec) => ec.categoryId));
        } catch {
            // silently fail, user sees empty state
        } finally {
            setLoading(false);
        }
    }, [entityId, api]);

    useEffect(() => {
        if (entityId) {
            loadData();
        }
    }, [entityId, loadData]);

    const assignedCategories = allCategories.filter((c) => assignedCategoryIds.includes(c.categoryId));
    const availableCategories = allCategories.filter((c) => !assignedCategoryIds.includes(c.categoryId));
    const filtered = search.trim()
        ? availableCategories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        : availableCategories;
    const showCreateOption = search.trim() && !allCategories.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());

    const handleAdd = async (categoryId: string) => {
        setAssignedCategoryIds((prev) => [...prev, categoryId]);
        try {
            await api.add(entityId, categoryId);
        } catch {
            setAssignedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
        }
    };

    const handleRemove = async (categoryId: string) => {
        setAssignedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
        try {
            await api.remove(entityId, categoryId);
        } catch {
            setAssignedCategoryIds((prev) => [...prev, categoryId]);
        }
    };

    const handleCreate = async () => {
        const name = search.trim();
        if (!name) return;
        setCreating(true);
        try {
            const newCat = await categoriesApi.create({ name });
            setAllCategories((prev) => [...prev, newCat]);
            setSearch('');
            await handleAdd(newCat.categoryId);
        } catch {
            // silently fail
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading categories...
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {assignedCategories.map((cat) => (
                <Badge key={cat.categoryId} variant="secondary" className="flex items-center gap-1">
                    {cat.name}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => handleRemove(cat.categoryId)}
                            className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </Badge>
            ))}

            {!disabled && (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                            <Plus className="h-3 w-3" />
                            Add
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2">
                        <Input
                            placeholder="Search or create..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 text-sm mb-2"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {filtered.map((cat) => (
                                <button
                                    key={cat.categoryId}
                                    type="button"
                                    onClick={() => {
                                        handleAdd(cat.categoryId);
                                        setSearch('');
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent truncate"
                                >
                                    {cat.name}
                                </button>
                            ))}
                            {filtered.length === 0 && !showCreateOption && (
                                <p className="text-xs text-muted-foreground px-2 py-1">No categories available</p>
                            )}
                            {showCreateOption && (
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent text-primary font-medium"
                                >
                                    {creating ? (
                                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                                    ) : (
                                        <Plus className="h-3 w-3 inline mr-1" />
                                    )}
                                    Create &ldquo;{search.trim()}&rdquo;
                                </button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
