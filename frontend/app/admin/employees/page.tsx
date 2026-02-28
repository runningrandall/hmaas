'use client';

import { UserCog } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployeesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <UserCog className="h-6 w-6" />
                    Employee Management
                </h1>
                <p className="text-muted-foreground">Manage employees, servicers, and capabilities.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Employees</CardTitle>
                    <CardDescription>Employee management features coming soon.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">This page will allow you to manage employees, assign servicer roles, and track capabilities.</p>
                </CardContent>
            </Card>
        </div>
    );
}
