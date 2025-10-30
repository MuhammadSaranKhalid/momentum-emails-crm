'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGetIdentity } from "@refinedev/core";
import { LucideIcon, LayoutGrid, Send, Users, FileText } from "lucide-react";
import { MicrosoftAccountSwitcher } from "@/components/microsoft-account-switcher";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Types
interface UserIdentity {
  name: string;
  email: string;
  avatar_url?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  exactMatch?: boolean;
}

// Navigation configuration
const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutGrid,
    exactMatch: true, // Only active when exactly /dashboard
  },
  {
    title: "Campaigns",
    href: "/dashboard/campaigns",
    icon: Send,
  },
  {
    title: "Agents",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    title: "Templates",
    href: "/dashboard/templates",
    icon: FileText,
  },
];

// Helper to get user initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function V2Sidebar() {
  const pathname = usePathname();
  const { data: identity, isLoading, isError } = useGetIdentity<UserIdentity>();

  // Improved active check with exact match support
  const isActive = (href: string, exactMatch?: boolean) => {
    if (!pathname) return false;
    
    if (exactMatch) {
      return pathname === href;
    }
    
    return pathname.startsWith(href);
  };

  // Transform identity to user object
  const user = identity
    ? {
        name: identity.name || 'User',
        email: identity.email || '',
        avatar: identity.avatar_url || '',
        initials: getInitials(identity.name || 'User'),
      }
    : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Expanded: show switcher and trigger aligned right */}
        <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
          <MicrosoftAccountSwitcher />
          <SidebarTrigger />
        </div>
        {/* Collapsed: center a trigger so it's always visible */}
        <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exactMatch);

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={active}
                    tooltip={item.title}
                    className={cn(
                      "data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
                      "data-[active=true]:hover:bg-primary/15 data-[active=true]:hover:text-primary"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {isLoading ? (
          <div className="flex items-center gap-2 px-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ) : isError ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Failed to load user
          </div>
        ) : user ? (
          <NavUser user={user} />
        ) : null}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
