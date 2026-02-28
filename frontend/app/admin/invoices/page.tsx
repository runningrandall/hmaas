'use client';

import { DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoicesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <DollarSign className="h-6 w-6" />
                    Invoice Management
                </h1>
                <p className="text-muted-foreground">Manage invoices, payments, and billing schedules.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>Invoice management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to create, view, and manage invoices and payment methods.</p>
                </CardContent>
            </Card>
        </div>
    );
}
