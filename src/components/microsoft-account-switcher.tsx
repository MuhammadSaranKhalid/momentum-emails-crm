"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Check, Mail } from "lucide-react"
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
import { AddIMAPDialog } from "@/components/add-imap-dialog";

export function MicrosoftAccountSwitcher() {
  const { isMobile, state } = useSidebar()
  const router = useRouter()
  const dispatch = useDispatch();
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);
  const [showIMAPDialog, setShowIMAPDialog] = React.useState(false);

  const { data: identity } = useGetIdentity<{ id: string }>();

  // Fetch ALL email accounts (Microsoft + IMAP/SMTP)
  const { result: accountsData, query: {isLoading, refetch} } = useList<UserAccount>({
    resource: "user_tokens",
      filters: [
          {
              field: "user_id",
              operator: "eq",
              value: identity?.id,
          }
      ],
      queryOptions: {
          enabled: !!identity?.id,
      },
  });

  const accounts = React.useMemo(() => {
    const data = accountsData?.data || [];
    if (data.length > 0) {
      console.log('Email Accounts loaded:', data);
    }
    return data;
  }, [accountsData?.data]);

  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      console.log('Auto-selecting first account:', accounts[0]);
      dispatch(setSelectedAccount(accounts[0]));
    }
  }, [accounts, selectedAccount, dispatch]);

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      const emailUser = email.split('@')[0];
      return emailUser.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  const getDisplayName = (account: UserAccount) => {
    return account.name || account.email?.split('@')[0] || 'Unknown User';
  };

  const getProviderBadge = (provider: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      microsoft: { label: 'Microsoft', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
      imap: { label: 'IMAP', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
      smtp: { label: 'SMTP', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
    };
    return badges[provider] || { label: provider.toUpperCase(), color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400' };
  };

  const handleAddMicrosoft = () => {
    router.push('/api/auth/microsoft/connect')
  }

  const handleAddIMAP = () => {
    setShowIMAPDialog(true);
  }

  const handleIMAPSuccess = () => {
    refetch();
  }

  if (isLoading) {
    return (
      <div className={cn(state === "expanded" && "p-2")}>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton 
                size="lg"
                className={cn(state === "collapsed" && "p-0 justify-center")}
              >
                  {state === "collapsed" ? (
                    <div className="flex w-full items-center justify-center">
                      <div className="size-8 rounded-lg bg-muted animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="size-10 rounded-full bg-muted animate-pulse" />
                      <div className="flex flex-col gap-1">
                          <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
                          <div className="h-3 w-32 rounded-md bg-muted animate-pulse" />
                      </div>
                    </>
                  )}
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    )
  }

  if (accounts.length === 0 || !selectedAccount) {
    return (
        <>
          <div className={cn(state === "expanded" && "p-2")}>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                        size="lg"
                        className={cn(
                          "border border-dashed border-sidebar-border hover:border-primary/50",
                          "hover:bg-sidebar-accent/50 transition-colors",
                          state === "collapsed" && "p-0 justify-center"
                        )}
                    >
                        {state === "collapsed" ? (
                          <div className="flex w-full items-center justify-center">
                            <div className="flex size-8 items-center justify-center rounded-lg border bg-sidebar-border">
                                <Plus className="size-4" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex size-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                                <Plus className="size-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-semibold text-sm">Add Email Account</span>
                                <span className="text-xs text-muted-foreground">Microsoft or IMAP/SMTP</span>
                            </div>
                          </>
                        )}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[240px] rounded-lg"
                    align="start"
                    side={isMobile ? "bottom" : "right"}
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                      Choose Account Type
                    </DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={handleAddMicrosoft} 
                      className="gap-2 p-2 cursor-pointer"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent shrink-0">
                        <Plus className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium">Microsoft Account</div>
                        <div className="text-xs text-muted-foreground">OAuth authentication</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleAddIMAP} 
                      className="gap-2 p-2 cursor-pointer"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent shrink-0">
                        <Mail className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium">IMAP/SMTP Account</div>
                        <div className="text-xs text-muted-foreground">Gmail, Outlook, Yahoo, etc.</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
          <AddIMAPDialog
            open={showIMAPDialog}
            onOpenChange={setShowIMAPDialog}
            onSuccess={handleIMAPSuccess}
          />
        </>
    )
}

  return (
    <div className={cn(state === "expanded" && "p-2")}>
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
                "shadow-sm",
                state === "collapsed" && "p-0 justify-center"
              )}
            >
              {state === "collapsed" ? (
                <div className="flex w-full items-center justify-center">
                  <Avatar className="size-8 rounded-lg">
                    {selectedAccount.avatar && selectedAccount.avatar.trim() !== '' ? (
                      <AvatarImage 
                        src={selectedAccount.avatar} 
                        alt={getDisplayName(selectedAccount)}
                        className="rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(selectedAccount.name || '', selectedAccount.email || '')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <>
                  <Avatar className="size-10 shrink-0 ring-2 ring-background">
                    {selectedAccount.avatar && selectedAccount.avatar.trim() !== '' ? (
                      <AvatarImage 
                        src={selectedAccount.avatar} 
                        alt={getDisplayName(selectedAccount)}
                        onError={(e) => {
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
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[300px] rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Email Accounts
            </DropdownMenuLabel>
            {accounts.map((account, index) => {
              const isSelected = selectedAccount?.id === account.id;
              const badge = getProviderBadge(account.provider);
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
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {getDisplayName(account)}
                      </span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                        badge.color
                      )}>
                        {badge.label}
                      </span>
                    </div>
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
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Add New Account
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={handleAddMicrosoft} 
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent shrink-0">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Microsoft (OAuth)
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleAddIMAP} 
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent shrink-0">
                <Mail className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                IMAP/SMTP
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
      <AddIMAPDialog
        open={showIMAPDialog}
        onOpenChange={setShowIMAPDialog}
        onSuccess={handleIMAPSuccess}
      />
    </div>
  )
}
