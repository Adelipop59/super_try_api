"use client"

import * as React from "react"
import {
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconSettings,
  IconShoppingCart,
  IconPackage,
  IconCampaign,
  IconClipboardList,
  IconMessageCircle,
  IconWallet,
  IconBell,
  IconStar,
  IconUsers,
  IconChartBar,
  IconFlag,
  IconFileText,
  IconTags,
  IconAlertCircle,
  IconGift,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"

// Navigation items for USER role
const userNavigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Campagnes",
    url: "/campaigns",
    icon: IconCampaign,
  },
  {
    title: "Mes Sessions",
    url: "/sessions",
    icon: IconClipboardList,
  },
  {
    title: "Wallet",
    url: "/wallet",
    icon: IconWallet,
  },
  {
    title: "Mes Reviews",
    url: "/reviews",
    icon: IconStar,
  },
]

// Navigation items for PRO role
const proNavigation = [
  {
    title: "Dashboard",
    url: "/pro-dashboard",
    icon: IconDashboard,
  },
  {
    title: "Produits",
    url: "/pro/products",
    icon: IconPackage,
  },
  {
    title: "Campagnes",
    url: "/pro/campaigns",
    icon: IconCampaign,
  },
  {
    title: "Sessions",
    url: "/pro/sessions",
    icon: IconClipboardList,
  },
  {
    title: "Messages",
    url: "/pro/messages",
    icon: IconMessageCircle,
  },
]

// Navigation items for ADMIN role
const adminNavigation = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: IconDashboard,
  },
  {
    title: "Utilisateurs",
    url: "/admin/users",
    icon: IconUsers,
  },
  {
    title: "Catégories",
    url: "/admin/categories",
    icon: IconTags,
  },
  {
    title: "Produits",
    url: "/admin/products",
    icon: IconPackage,
  },
  {
    title: "Campagnes",
    url: "/admin/campaigns",
    icon: IconCampaign,
  },
  {
    title: "Disputes",
    url: "/admin/disputes",
    icon: IconAlertCircle,
  },
  {
    title: "Retraits",
    url: "/admin/withdrawals",
    icon: IconWallet,
  },
  {
    title: "Logs",
    url: "/admin/logs",
    icon: IconFileText,
  },
]

// Secondary navigation (common to all roles)
const secondaryNavigation = [
  {
    title: "Notifications",
    url: "/notifications",
    icon: IconBell,
  },
  {
    title: "Profil",
    url: "/profile",
    icon: IconSettings,
  },
  {
    title: "Aide",
    url: "/help",
    icon: IconHelp,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  // Determine which navigation to show based on user role
  const getNavigationForRole = () => {
    if (!user) return []

    switch (user.role) {
      case 'ADMIN':
        return adminNavigation
      case 'PRO':
        return proNavigation
      case 'USER':
      default:
        return userNavigation
    }
  }

  const navItems = getNavigationForRole()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Super Try API</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={secondaryNavigation} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user || { name: "Utilisateur", email: "", avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
