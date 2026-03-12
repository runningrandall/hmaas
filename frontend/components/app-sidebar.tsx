"use client"

import { Calendar, Home, Users, Building2, MapPin, Wrench, FileText, UserCog, DollarSign, Settings, Globe, Tag, Truck } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

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
} from "@/components/ui/sidebar"
import { useAdminAuthContext } from "@/contexts/admin-auth-context"

const managementItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Customers", url: "/admin/customers", icon: Users },
    { title: "Properties", url: "/admin/properties", icon: MapPin },
    { title: "Services", url: "/admin/services", icon: Wrench },
    { title: "Categories", url: "/admin/categories", icon: Tag },
    { title: "Plans", url: "/admin/plans", icon: FileText },
    { title: "Property Types", url: "/admin/property-types", icon: Building2 },
]

const operationsItems = [
    { title: "Schedules", url: "/admin/schedules", icon: Calendar },
    { title: "Employees", url: "/admin/employees", icon: UserCog },
    { title: "Subcontractors", url: "/admin/subcontractors", icon: Truck },
    { title: "Invoices", url: "/admin/invoices", icon: DollarSign },
]

function isActive(pathname: string, url: string): boolean {
    if (url === "/admin") return pathname === "/admin"
    return pathname === url || pathname.startsWith(url + "/")
}

export function AppSidebar() {
    const { isSuperAdmin } = useAdminAuthContext()
    const pathname = usePathname()

    const systemItems = useMemo(() => {
        const items = [
            { title: "Settings", url: "/admin/settings", icon: Settings },
        ]
        if (isSuperAdmin) {
            items.unshift({ title: "Organizations", url: "/admin/organizations", icon: Globe })
        }
        return items
    }, [isSuperAdmin])

    const renderMenuItems = (items: typeof managementItems) =>
        items.map((item) => (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive(pathname, item.url)}>
                    <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        ))

    return (
        <Sidebar collapsible="none">
            <SidebarHeader className="flex flex-row items-center px-4 py-2">
                <span className="text-lg font-semibold">Versa Admin</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(managementItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Operations</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(operationsItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {renderMenuItems(systemItems)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
