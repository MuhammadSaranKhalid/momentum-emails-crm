'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { CampaignActions } from './campaign-actions';

// Define Campaign type based on improved schema
export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  user_token_id: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  bounced_count: number;
  created_at: string;
  updated_at: string;
}

const getStatusBadgeConfig = (status: Campaign['status']) => {
  switch (status) {
    case 'sent':
      return {
        variant: 'default' as const,
        className: 'bg-green-500 hover:bg-green-600 text-white'
      };
    case 'draft':
      return {
        variant: 'secondary' as const,
        className: 'bg-gray-500 hover:bg-gray-600 text-white'
      };
    case 'sending':
      return {
        variant: 'default' as const,
        className: 'bg-blue-500 hover:bg-blue-600 text-white animate-pulse'
      };
    case 'scheduled':
      return {
        variant: 'outline' as const,
        className: 'border-purple-500 text-purple-700 dark:text-purple-400'
      };
    case 'paused':
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white'
      };
    case 'cancelled':
      return {
        variant: 'destructive' as const,
        className: ''
      };
    default:
      return {
        variant: 'secondary' as const,
        className: ''
      };
  }
};

export const columns: ColumnDef<Campaign>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Campaign Name" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col max-w-md">
          <span className="font-medium truncate">{row.getValue('name')}</span>
          <span className="text-sm text-muted-foreground truncate">{row.original.subject}</span>
        </div>
      );
    },
    minSize: 200,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as Campaign['status'];
      const { variant, className } = getStatusBadgeConfig(status);
      return (
        <Badge variant={variant} className={className}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'total_recipients',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Recipients" />,
    cell: ({ row }) => {
      const total = row.getValue('total_recipients') as number;
      const sent = row.original.sent_count;
      const delivered = row.original.delivered_count;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{total}</span>
          {sent > 0 && (
            <span className="text-xs text-muted-foreground">
              {sent} sent{delivered > 0 && `, ${delivered} delivered`}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      let relativeTime = '';
      if (diffInHours < 1) {
        relativeTime = 'Just now';
      } else if (diffInHours < 24) {
        relativeTime = `${diffInHours}h ago`;
      } else if (diffInHours < 48) {
        relativeTime = 'Yesterday';
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        relativeTime = `${diffInDays}d ago`;
      }
      
      return (
        <div className="flex flex-col">
          <span className="text-sm">{date.toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>
      );
    },
    minSize: 120,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <CampaignActions campaign={row.original} />;
    },
  },
];

