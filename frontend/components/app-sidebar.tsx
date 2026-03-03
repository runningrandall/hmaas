"use client"

import { Calendar, Home, Users, Building2, Wrench, FileText, UserCog, DollarSign, Settings, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

const managementItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Customers", url: "/admin/customers", icon: Users },
    { title: "Properties", url: "/admin/properties", icon: Building2 },
    { title: "Services", url: "/admin/services", icon: Wrench },
    { title: "Plans", url: "/admin/plans", icon: FileText },
]

const operationsItems = [
    { title: "Schedules", url: "/admin/schedules", icon: Calendar },
    { title: "Employees", url: "/admin/employees", icon: UserCog },
    { title: "Invoices", url: "/admin/invoices", icon: DollarSign },
]

const systemItems = [
    { title: "Settings", url: "/admin/settings", icon: Settings },
]

export function AppSidebar() {
    const { toggleSidebar } = useSidebar()

    return (
        <Sidebar>
            <SidebarHeader className="flex flex-row items-center justify-between px-4 py-2">
                <span className="text-lg font-semibold">Versa Admin</span>
                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close sidebar</span>
                </Button>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {managementItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Operations</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {operationsItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {systemItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
