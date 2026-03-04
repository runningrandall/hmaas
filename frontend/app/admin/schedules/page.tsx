'use client';

import { Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SchedulesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    Schedule Management
                </h1>
                <p className="text-muted-foreground">Manage service schedules and assignments.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Schedules</CardTitle>
                    <CardDescription>Schedule management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to view, create, and manage service schedules for servicers.</p>
                </CardContent>
            </Card>
        </div>
    );
}
