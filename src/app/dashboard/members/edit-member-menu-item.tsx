'use client';

import { useState } from 'react';
import { Edit } from 'lucide-react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { EditMemberDialog } from './edit-member-dialog';
import type { Member } from './data/schema';

interface EditMemberMenuItemProps {
  member: Member;
}

export function EditMemberMenuItem({ member }: EditMemberMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleUpdate = () => {
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setIsOpen(true)}>
        <Edit className="mr-2 h-4 w-4" />
        <span>Edit</span>
      </DropdownMenuItem>
      <EditMemberDialog
        member={member}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onMemberUpdated={handleUpdate}
      />
    </>
  );
}

