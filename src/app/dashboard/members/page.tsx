'use client';

import * as React from 'react';
import { useList } from '@refinedev/core';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { Users } from 'lucide-react';

import { columns as memberColumns } from './columns';
import { DataTable } from '@/components/data-table/data-table';
import { CreateMemberDialog } from './create-member-dialog';
import { Member } from './data/schema';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from '@/components/ui/spinner';
import { DataTableToolbarActions } from './data-table-toolbar-actions';

const PAGE_SIZE = 10;

export default function MembersPage() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const { result: membersData, query: {isLoading, isError, error} } = useList<Member>({
    resource: 'members',
    pagination: {
      currentPage: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      mode: 'server',
    },
    sorters: [
      {
        field: 'created_at',
        order: 'desc',
      },
    ],
  });

  const columns = React.useMemo<ColumnDef<Member>[]>(() => memberColumns, []);
  const members = membersData?.data || [];
  const totalMembers = membersData?.total || 0;
  const pageCount = Math.ceil(totalMembers / pagination.pageSize);

  // Error state
  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Error Loading Members</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Failed to load members. Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && members.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>
              Create your first member to start managing your contacts and clients.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateMemberDialog />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col space-y-6 p-8 pt-6 overflow-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage your contacts and clients
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <DataTable
          data={members}
          columns={columns}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          toolbarActions={<DataTableToolbarActions />}
        />
      )}
    </div>
  );
}

