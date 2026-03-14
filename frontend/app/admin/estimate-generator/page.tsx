'use client';

import { useState } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SERVICES = [
    { name: 'Window Cleaning', cadence: '3x per year', visitsPerYear: 3, unit: 'window', pricePerUnit: 8.00 },
    { name: 'Lawn Aeration', cadence: '2x per year (spring & fall)', visitsPerYear: 2, unit: '0.25 acre', pricePerUnit: 12.00 },
    { name: 'Lawn Mow & Trim', cadence: 'Weekly (seasonal)', visitsPerYear: 30, unit: '0.25 acre', pricePerUnit: 60.00 },
    { name: 'Lawn Fertilizer', cadence: '5x per year', visitsPerYear: 5, unit: '0.25 acre', pricePerUnit: 50.00 },
    { name: 'Sprinkler Winterization', cadence: '1x per year (fall)', visitsPerYear: 1, unit: 'zone', pricePerUnit: 18.00 },
    { name: 'Shrub Pruning', cadence: '2x per year', visitsPerYear: 3, unit: 'shrub', pricePerUnit: 10.00 },
    { name: 'Gutter Cleaning', cadence: '1x per year', visitsPerYear: 1, unit: 'linear foot', pricePerUnit: 1.00 },
    { name: 'Garbage Bin Cleaning', cadence: '2x per year', visitsPerYear: 2, unit: 'bin', pricePerUnit: 15.00 },
    { name: 'Leaf Removal', cadence: '3x per year (fall)', visitsPerYear: 3, unit: '0.25 acre', pricePerUnit: 60.00 },
    { name: 'Driveway/Deck Cleaning', cadence: '1x per year', visitsPerYear: 1, unit: 'sq ft', pricePerUnit: 0.30 },
    { name: 'Weed Control (Chemical)', cadence: '5x per year', visitsPerYear: 5, unit: '0.25 acre', pricePerUnit: 45.00 },
    { name: 'Flower Bed Maintenance', cadence: 'Monthly (seasonal)', visitsPerYear: 7, unit: 'bed', pricePerUnit: 30.00 },
    { name: 'Exterior House Wash', cadence: '1x per year', visitsPerYear: 1, unit: 'sq ft', pricePerUnit: 0.20 },
    { name: 'Spring/Fall Cleanup', cadence: '2x per year', visitsPerYear: 2, unit: '0.25 acre', pricePerUnit: 75.00 },
    { name: 'Sprinkler Startup', cadence: '1x per year (spring)', visitsPerYear: 1, unit: 'zone', pricePerUnit: 15.00 },
];

interface LineItem {
    id: number;
    serviceIndex: number;
    quantity: number;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function EstimateGeneratorPage() {
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    let nextId = 0;

    const addLineItem = () => {
        setLineItems((prev) => [
            ...prev,
            { id: Date.now() + nextId++, serviceIndex: 0, quantity: 1 },
        ]);
    };

    const updateLineItem = (id: number, updates: Partial<LineItem>) => {
        setLineItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
    };

    const removeLineItem = (id: number) => {
        setLineItems((prev) => prev.filter((item) => item.id !== id));
    };

    const getLineItemCosts = (item: LineItem) => {
        const service = SERVICES[item.serviceIndex];
        const oneTime = service.pricePerUnit * item.quantity;
        const annual = oneTime * service.visitsPerYear;
        const monthly = annual / 12;
        return { oneTime, annual, monthly };
    };

    const totals = lineItems.reduce(
        (acc, item) => {
            const costs = getLineItemCosts(item);
            return {
                oneTime: acc.oneTime + costs.oneTime,
                annual: acc.annual + costs.annual,
                monthly: acc.monthly + costs.monthly,
            };
        },
        { oneTime: 0, annual: 0, monthly: 0 }
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Calculator className="h-6 w-6" />
                        Estimate Generator
                    </h1>
                    <p className="text-muted-foreground">Build a service estimate with cost breakdowns.</p>
                </div>
                <Button onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Per Visit Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.oneTime)}</div>
                        <p className="text-xs text-muted-foreground">Sum of all single-visit costs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.monthly)}</div>
                        <p className="text-xs text-muted-foreground">Annual total / 12</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Annual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.annual)}</div>
                        <p className="text-xs text-muted-foreground">All services for the year</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Service Line Items</CardTitle>
                    <CardDescription>Select services and enter quantities to calculate costs.</CardDescription>
                </CardHeader>
                <CardContent>
                    {lineItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No services added yet. Click &quot;Add Service&quot; to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Cadence</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead className="text-right">Per Visit</TableHead>
                                    <TableHead className="text-right">Monthly</TableHead>
                                    <TableHead className="text-right">Annual</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lineItems.map((item) => {
                                    const service = SERVICES[item.serviceIndex];
                                    const costs = getLineItemCosts(item);
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <select
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    value={item.serviceIndex}
                                                    onChange={(e) =>
                                                        updateLineItem(item.id, { serviceIndex: parseInt(e.target.value) })
                                                    }
                                                >
                                                    {SERVICES.map((s, i) => (
                                                        <option key={i} value={i}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">{service.cadence}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        className="w-20"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateLineItem(item.id, {
                                                                quantity: Math.max(1, parseFloat(e.target.value) || 1),
                                                            })
                                                        }
                                                    />
                                                    <Label className="text-sm text-muted-foreground whitespace-nowrap">
                                                        {service.unit}
                                                        {item.quantity !== 1 ? 's' : ''}
                                                        {' '}@ {formatCurrency(service.pricePerUnit)}
                                                    </Label>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(costs.oneTime)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(costs.monthly)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(costs.annual)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeLineItem(item.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                <TableRow className="border-t-2 font-bold">
                                    <TableCell colSpan={3} className="text-right">
                                        Totals
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.oneTime)}</TableCell>
                                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totals.monthly)}
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.annual)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pricing Reference</CardTitle>
                    <CardDescription>Base pricing for all available services.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Cadence</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Price Per Unit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {SERVICES.map((s, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{s.name}</TableCell>
                                    <TableCell>{s.cadence}</TableCell>
                                    <TableCell>{s.unit}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(s.pricePerUnit)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
