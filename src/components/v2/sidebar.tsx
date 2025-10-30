'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { MicrosoftAccountSwitcher } from "@/components/microsoft-account-switcher";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutGrid,
  Send,
  Users,
  FileText,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function V2Sidebar() {
  const pathname = usePathname();
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

  const isActive = (path: string) => {
    return pathname?.startsWith(path);
  };

  // Create user object from selected account
  const user = selectedAccount ? {
    name: selectedAccount.name || 'User',
    email: selectedAccount.email || '',
    avatar: selectedAccount.avatar || '',
  } : null;

  return (
      <Sidebar>
        <SidebarHeader>
          <MicrosoftAccountSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <nav className="flex flex-col gap-2">
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/dashboard") && pathname === "/dashboard"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                href="/dashboard"
              >
                <LayoutGrid className="h-5 w-5" />
                <span>Overview</span>
              </Link>
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/dashboard/campaigns")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                href="/dashboard/campaigns"
              >
                <Send className="h-5 w-5" />
                <span>Campaigns</span>
              </Link>
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/dashboard/members")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                href="/dashboard/members"
              >
                <Users className="h-5 w-5" />
                <span>Agents</span>
              </Link>
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/dashboard/templates")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                href="/dashboard/templates"
              >
                <FileText className="h-5 w-5" />
                <span>Templates</span>
              </Link>
            </nav>
          </SidebarGroup>
          {/* <SidebarGroup className="mt-auto">
            <Link
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/dashboard/settings")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              href="#"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
            <Link
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              href="#"
            >
              <HelpCircle className="h-5 w-5" />
              <span>Help</span>
            </Link>
          </SidebarGroup> */}
        </SidebarContent>
        <SidebarFooter>
          {user && <NavUser user={user} />}
        </SidebarFooter>
      </Sidebar>
  );
}
