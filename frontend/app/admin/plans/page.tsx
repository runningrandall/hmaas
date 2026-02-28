'use client';

import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlansPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Plan Management
                </h1>
                <p className="text-muted-foreground">Create and manage service plans and pricing.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Plans</CardTitle>
                    <CardDescription>Plan management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to create plans, set pricing, and assign included services.</p>
                </CardContent>
            </Card>
        </div>
    );
}
