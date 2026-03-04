'use client';

import { Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServicesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Wrench className="h-6 w-6" />
                    Service Management
                </h1>
                <p className="text-muted-foreground">Manage service types and active property services.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Services</CardTitle>
                    <CardDescription>Service management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to configure service types and manage property service assignments.</p>
                </CardContent>
            </Card>
        </div>
    );
}
