'use client';

import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Customer Management
                </h1>
                <p className="text-muted-foreground">View and manage customers across the platform.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Customers</CardTitle>
                    <CardDescription>Customer management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to search, filter, and manage all customers.</p>
                </CardContent>
            </Card>
        </div>
    );
}
