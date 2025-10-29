'use client';

import * as React from 'react';
import { useList, useGetIdentity, useDelete } from '@refinedev/core';
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { UserAccount } from '@/types/user-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

export function ConnectedAccountsList() {
  const router = useRouter();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const [accountToDelete, setAccountToDelete] = React.useState<UserAccount | null>(null);

  const { result: accountsData, query: { isLoading, refetch } } = useList<UserAccount>({
    resource: 'user_tokens',
    filters: [
      {
        field: 'user_id',
        operator: 'eq',
        value: identity?.id,
      },
      {
        field: 'provider',
        operator: 'eq',
        value: 'microsoft',
      },
    ],
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { mutate: deleteAccount, mutation: { isPending: isDeleting } } = useDelete();

  const accounts = React.useMemo(() => accountsData?.data || [], [accountsData?.data]);

  const handleConnectAccount = () => {
    router.push('/api/auth/microsoft/connect');
  };

  const handleDeleteAccount = (account: UserAccount) => {
    setAccountToDelete(account);
  };

  const confirmDeleteAccount = () => {
    if (!accountToDelete) return;

    deleteAccount(
      {
        resource: 'user_tokens',
        id: accountToDelete.id,
      },
      {
        onSuccess: () => {
          toast.success('Account disconnected successfully');
          setAccountToDelete(null);
          refetch();
        },
        onError: (error) => {
          console.error('Error disconnecting account:', error);
          toast.error('Failed to disconnect account');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected Microsoft accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Spinner className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage your connected Microsoft accounts for sending emails
              </CardDescription>
            </div>
            <Button onClick={handleConnectAccount} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Connect Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect a Microsoft account to start sending emails
              </p>
              <Button onClick={handleConnectAccount}>
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={account.avatar} alt={account.name} />
                      <AvatarFallback>
                        {account.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{account.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Provider: Microsoft
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAccount(account)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!accountToDelete}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{' '}
              <span className="font-semibold">{accountToDelete?.email}</span>?
              You won&apos;t be able to send emails from this account until you
              reconnect it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

