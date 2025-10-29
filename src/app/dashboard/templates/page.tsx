'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useList } from '@refinedev/core';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { FileText, PlusCircle } from 'lucide-react';

import { templateColumns } from './columns';
import { DataTable } from '@/components/data-table/data-table';
import { Template } from './data/schema';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;

export default function TemplatesPage() {
  const router = useRouter();
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const { result: templatesData, query: {isLoading, isError, error} } = useList<Template>({
    resource: 'templates',
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

  const columns = React.useMemo<ColumnDef<Template>[]>(() => templateColumns, []);
  const templates = templatesData?.data || [];
  const totalTemplates = templatesData?.total || 0;
  const pageCount = Math.ceil(totalTemplates / pagination.pageSize);

  // Toolbar actions component
  const toolbarActions = (
    <Button onClick={() => router.push('/dashboard/templates/new')}>
      <PlusCircle className="mr-2 h-4 w-4" />
      Create Template
    </Button>
  );

  // Error state
  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Error Loading Templates</h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Failed to load templates. Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && templates.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>
              Create your first email template to get started. Templates help you save time by reusing email designs.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push('/dashboard/templates/new')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col space-y-6 p-8 pt-6 overflow-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage email templates for your campaigns
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <DataTable
          data={templates}
          columns={columns}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          toolbarActions={toolbarActions}
        />
      )}
    </div>
  );
}

