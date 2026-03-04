'use client';

import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PropertiesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="h-6 w-6" />
                    Property Management
                </h1>
                <p className="text-muted-foreground">Manage properties and their service assignments.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Properties</CardTitle>
                    <CardDescription>Property management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to view, add, and manage all properties.</p>
                </CardContent>
            </Card>
        </div>
    );
}
