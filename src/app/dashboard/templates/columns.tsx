'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { Star } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import type { Template } from './data/schema';
import { categoryColors } from './data/schema';
import { TemplateActions } from './template-actions';
import { cn } from '@/lib/utils';

export const templateColumns: ColumnDef<Template>[] = [
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Template Name" />,
    cell: ({ row }) => {
      const name = row.getValue('name') as string;
      const description = row.original.description;
      const isFavorite = row.original.is_favorite;
      
      return (
        <div className="flex items-start gap-2 max-w-md">
          {isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{name}</div>
            {description && (
              <div className="text-xs text-muted-foreground truncate">{description}</div>
            )}
          </div>
        </div>
      );
    },
    minSize: 250,
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subject" />,
    cell: ({ row }) => {
      const subject = row.getValue('subject') as string;
      return (
        <div className="max-w-md truncate text-sm">{subject}</div>
      );
    },
    minSize: 200,
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => {
      const category = row.getValue('category') as string | undefined;
      
      if (!category) return <span className="text-xs text-muted-foreground">-</span>;
      
      return (
        <Badge variant="secondary" className={cn("text-xs", categoryColors[category])}>
          {category}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      return (
        <div className="flex flex-col">
          <span className="text-sm">
            {date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <TemplateActions template={row.original} />,
  },
];

