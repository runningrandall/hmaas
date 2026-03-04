'use client';

import { useEffect, useState } from 'react';
import { customersApi, Customer } from '../../lib/api';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Loader2, Users, Building2, Wrench, DollarSign } from "lucide-react"

export default function AdminDashboard() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await customersApi.list();
            setCustomers(data.items || []);
            setError('');
        } catch (err: unknown) {
            console.error(err);
            setError('Failed to load customers. You might not have permission.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;

        setCreating(true);
        try {
            await customersApi.create({
                firstName: newFirstName,
                lastName: newLastName,
                email: newEmail,
            });
            setNewFirstName('');
            setNewLastName('');
            setNewEmail('');
            await loadCustomers();
        } catch {
            setError('Failed to create customer');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (customerId: string) => {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        try {
            await customersApi.delete(customerId);
            await loadCustomers();
        } catch (err: unknown) {
            console.error(err);
            setError('Failed to delete customer');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Versa Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage customers, properties, services, and more.</p>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customers.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Properties</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add Customer</CardTitle>
                    <CardDescription>Create a new customer with an associated account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <Input
                            type="text"
                            value={newFirstName}
                            onChange={(e) => setNewFirstName(e.target.value)}
                            placeholder="First Name"
                            className="flex-1"
                        />
                        <Input
                            type="text"
                            value={newLastName}
                            onChange={(e) => setNewLastName(e.target.value)}
                            placeholder="Last Name"
                            className="flex-1"
                        />
                        <Input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Email"
                            className="flex-1"
                        />
                        <Button type="submit" disabled={creating || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Management</CardTitle>
                    <CardDescription>View and manage existing customers.</CardDescription>
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
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No customers found. Create one above!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer.customerId}>
                                            <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell>
                                            <TableCell>{customer.email}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                    customer.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    customer.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {customer.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(customer.customerId)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
