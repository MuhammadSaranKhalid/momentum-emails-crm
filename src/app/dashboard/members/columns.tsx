'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { Member } from './data/schema';
import { DeleteMemberMenuItem } from './delete-member-menu-item';
import { EditMemberMenuItem } from './edit-member-menu-item';

export const columns: ColumnDef<Member>[] = [
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
    accessorKey: 'full_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => {
      const firstName = row.original.first_name;
      const lastName = row.original.last_name;
      const fullName = row.getValue('full_name') as string || `${firstName} ${lastName}`;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{fullName}</span>
          {row.original.company_name && (
            <span className="text-xs text-muted-foreground">{row.original.company_name}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm">{row.getValue('email')}</span>
        {row.original.mobile && (
          <span className="text-xs text-muted-foreground">{row.original.mobile}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'country',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
    cell: ({ row }) => row.getValue('country') || '-',
  },
  {
    accessorKey: 'import_export',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const type = row.getValue('import_export') as string;
      if (!type) return '-';
      
      return (
        <Badge variant={
          type === 'Both' ? 'default' : 'secondary'
        }>
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'mode_of_shipment',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Shipment" />,
    cell: ({ row }) => {
      const mode = row.getValue('mode_of_shipment') as string;
      return mode || '-';
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const member = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(member.id)}
            >
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy member ID</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditMemberMenuItem member={member} />
            <DeleteMemberMenuItem memberId={member.id} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

