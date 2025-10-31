'use client';

import * as React from 'react';
import Link from 'next/link';
import { useList } from '@refinedev/core';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { FilePlus } from 'lucide-react';

import { columns as campaignColumns, Campaign } from './columns';
import { DataTable } from '@/components/data-table/data-table';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { CampaignFilters } from './campaign-filters';
import { DashboardHeader } from '@/components/dashboard-header';

const PAGE_SIZE = 10;

export default function CampaignsPage() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);

  const { result: campaignsData, query: {isLoading, isError, error} } = useList<Campaign>({
    resource: 'email_campaigns',
    sorters: [
      {
        field: "created_at",
        order: "desc",
      },
    ],
    filters: statusFilter.length > 0 
      ? [
          {
            field: 'status',
            operator: 'in',
            value: statusFilter,
          },
        ]
      : [],
    pagination: {
      currentPage: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      mode: 'server',
    },
  });

  const columns = React.useMemo<ColumnDef<Campaign>[]>(() => campaignColumns, []);
  const campaigns = campaignsData?.data || [];
  const totalCampaigns = campaignsData?.total || 0;
  const pageCount = Math.ceil(totalCampaigns / pagination.pageSize);

  // Header Actions - Only create button
  const headerActions = (
    <Button asChild>
      <Link href="/dashboard/campaigns/new">
        <FilePlus className="mr-2 h-4 w-4" />
        Create Campaign
      </Link>
    </Button>
  );

  // Toolbar Actions - Filters with view options
  const toolbarActions = (
    <CampaignFilters 
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
    />
  );

  // Error state
  if (isError) {
    return (
      <>
        <DashboardHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Campaigns' }
          ]}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <FilePlus className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Error Loading Campaigns</h2>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'Failed to load campaigns. Please try again later.'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Empty state - only show if no filters applied and no campaigns exist
  if (!isLoading && campaigns.length === 0 && statusFilter.length === 0) {
    return (
      <>
        <DashboardHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Campaigns' }
          ]}
          actions={
            <Button asChild>
              <Link href="/dashboard/campaigns/new">
                <FilePlus className="mr-2 h-4 w-4" />
                Create Campaign
              </Link>
            </Button>
          }
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilePlus />
              </EmptyMedia>
              <EmptyTitle>No campaigns yet</EmptyTitle>
              <EmptyDescription>Create your first campaign to start sending emails to your members.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/dashboard/campaigns/new">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Create New Campaign
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader 
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Campaigns' }
        ]}
        actions={headerActions}
      />
      <div className="flex flex-1 flex-col p-6 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <DataTable 
            data={campaigns} 
            columns={columns} 
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            toolbarActions={toolbarActions}
          />
        )}
      </div>
    </>
  );
}

