"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Check } from "lucide-react"
import { useDispatch, useSelector } from "react-redux";
import { useList, useGetIdentity } from "@refinedev/core";
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RootState } from "@/store";
import { setSelectedAccount } from "@/store/features/accounts/accountsSlice";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserAccount } from "@/types/user-tokens";
import { cn } from "@/lib/utils";

export function MicrosoftAccountSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const dispatch = useDispatch();
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

  const { data: identity } = useGetIdentity<{ id: string }>();

  const { result: accountsData, query: {isLoading} } = useList<UserAccount>({
    resource: "user_tokens",
      filters: [
          {
              field: "user_id",
              operator: "eq",
              value: identity?.id,
          },
          {
            field: "provider",
            operator: "eq",
            value: "microsoft",
        }
      ],
      queryOptions: {
          enabled: !!identity?.id,
      },
  });

  const accounts = React.useMemo(() => {
    const data = accountsData?.data || [];
    // Debug logging to check data structure
    if (data.length > 0) {
      console.log('Microsoft Accounts loaded:', data);
    }
    return data;
  }, [accountsData?.data]);

  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      console.log('Auto-selecting first account:', accounts[0]);
      dispatch(setSelectedAccount(accounts[0]));
    }
  }, [accounts, selectedAccount, dispatch]);

  // Helper function to get avatar initials
  const getInitials = (name: string, email: string) => {
    // Try to use name first
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    // Fallback to email
    if (email && email.trim()) {
      const emailUser = email.split('@')[0];
      return emailUser.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Helper function to get display name
  const getDisplayName = (account: UserAccount) => {
    return account.name || account.email?.split('@')[0] || 'Unknown User';
  };

  const handleAddAccount = () => {
    router.push('/api/auth/microsoft/connect')
  }

  if (isLoading) {
    return (
      <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                  <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted-foreground/20 animate-pulse" />
                      <div className="flex flex-col gap-1">
                          <div className="h-4 w-24 rounded-md bg-muted-foreground/20 animate-pulse" />
                          <div className="h-3 w-32 rounded-md bg-muted-foreground/20 animate-pulse" />
                      </div>
                  </div>
              </SidebarMenuButton>
          </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (accounts.length === 0 || !selectedAccount) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "w-full justify-start gap-3",
                      "border border-dashed border-sidebar-border hover:border-primary/50",
                      "hover:bg-sidebar-accent/50 transition-colors"
                    )}
                    onClick={handleAddAccount}
                >
                    <div className="flex size-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                        <Plus className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="font-semibold text-sm">Add Microsoft Account</span>
                        <span className="text-xs text-muted-foreground">Connect to send emails</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                "hover:bg-sidebar-accent/50 transition-colors",
                "border border-sidebar-border/50 hover:border-sidebar-border",
                "shadow-sm"
              )}
            >
              <Avatar className="size-10 shrink-0 ring-2 ring-background">
                {selectedAccount.avatar && selectedAccount.avatar.trim() !== '' ? (
                  <AvatarImage 
                    src={selectedAccount.avatar} 
                    alt={getDisplayName(selectedAccount)}
                    onError={(e) => {
                      // Hide image on error to show fallback
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold">
                  {getInitials(selectedAccount.name || '', selectedAccount.email || '')}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                <span className="truncate font-semibold text-foreground">
                  {getDisplayName(selectedAccount)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {selectedAccount.email || 'No email'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[280px] rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Microsoft Accounts
            </DropdownMenuLabel>
            {accounts.map((account, index) => {
              const isSelected = selectedAccount?.id === account.id;
              return (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => dispatch(setSelectedAccount(account))}
                  className={cn(
                    "gap-2 p-2 cursor-pointer",
                    isSelected && "bg-accent"
                  )}
                >
                  <Avatar className="size-8 shrink-0">
                    {account.avatar && account.avatar.trim() !== '' ? (
                      <AvatarImage 
                        src={account.avatar} 
                        alt={getDisplayName(account)}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(account.name || '', account.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {getDisplayName(account)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {account.email || 'No email'}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="size-4 shrink-0 text-primary" />
                  )}
                  {!isSelected && (
                    <DropdownMenuShortcut className="opacity-60">
                      ⌘{index + 1}
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleAddAccount} 
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent shrink-0">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add account
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
