'use client';

import { Member } from "@/app/dashboard/members/data/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserListProps {
  users: Member[];
  selectedUsers: Member[];
  onSelectionChange: (user: Member) => void;
  onSelectAll: (isSelected: boolean) => void;
  isAllSelected: boolean;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function UserList({
  users,
  selectedUsers,
  onSelectionChange,
  onSelectAll,
  isAllSelected,
  isLoading,
  searchTerm,
  onSearchChange
}: UserListProps) {
  return (
    <div>
        <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search by name or email..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
        <div className="flex items-center justify-between border-t border-b bg-muted/50 px-4 py-2">
            <div className="flex items-center gap-3">
                <Checkbox
                    id="select-all"
                    checked={isAllSelected}
                    onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
                    disabled={users.length === 0}
                />
                <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Select all ({users.length} matching)
                </label>
            </div>
            {selectedUsers.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => onSelectAll(false)}>
                    <X className="mr-2 h-4 w-4"/>
                    Clear ({selectedUsers.length})
                </Button>
            )}
        </div>
        <ScrollArea className="h-80">
          <div className="divide-y">
            {users.map((user, index) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'} ${index % 2 === 0 && !isSelected ? 'bg-muted/25' : ''}`}
                  onClick={() => onSelectionChange(user)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectionChange(user)}
                  />
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                    <AvatarFallback>{user.name?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )
            })}
            {users.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No members match your search.</p>
                </div>
            )}
          </div>
        </ScrollArea>
    </div>
  );
}
