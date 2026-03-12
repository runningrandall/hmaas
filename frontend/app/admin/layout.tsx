'use client';

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminAuthGuard>
            <SidebarProvider defaultOpen={true}>
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                        <div className="ml-auto">
                            <ThemeToggle />
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </AdminAuthGuard>
    )
}
