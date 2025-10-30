import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Search, Filter, ChevronDown, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Member } from "@/app/dashboard/members/data/schema";
import { setSelectedMemberIds, selectSelectedMemberIds } from "@/store/features/campaigns/campaignSlice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecipientsSidebarProps {
  members: Member[];
  isLoading: boolean;
}

// Filter types
type FilterCategory = "country" | "type" | "shipment";

interface FilterState {
  country: string[];
  type: string[];
  shipment: string[];
}

export function RecipientsSidebar({ members, isLoading }: RecipientsSidebarProps) {
  const dispatch = useDispatch();
  const selectedMemberIds = useSelector(selectSelectedMemberIds);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    country: [],
    type: [],
    shipment: [],
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    country: true,
    type: true,
    shipment: true,
  });

  // Toggle filter option
  const toggleFilter = (category: FilterCategory, value: string) => {
    setFilters((prev) => {
      const currentValues = prev[category];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [category]: newValues };
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      country: [],
      type: [],
      shipment: [],
    });
  };

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters_list: { category: string; value: string }[] = [];
    (Object.entries(filters) as [string, string[]][]).forEach(([category, values]) => {
      values.forEach((value) => {
        filters_list.push({ category, value });
      });
    });
    return filters_list;
  }, [filters]);

  // Filter members based on search query and filters
  const filteredMembers = useMemo(() => {
    let filtered = members;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const queryText = searchQuery.toLowerCase();
      filtered = filtered.filter((member: Member) => {
        const fullName = member.full_name || `${member.first_name} ${member.last_name}`;
        return fullName?.toLowerCase().includes(queryText) ||
          member.email?.toLowerCase().includes(queryText) ||
          member.company_name?.toLowerCase().includes(queryText);
      });
    }

    // Note: Additional filter logic would go here based on your member data structure
    // For now, we're just showing the UI structure
    
    return filtered;
  }, [members, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredMembers.map((m: Member) => m.id);
      dispatch(setSelectedMemberIds(allIds));
    } else {
      dispatch(setSelectedMemberIds([]));
    }
  };

  const handleSelectMember = (id: string, checked: boolean) => {
    if (checked) {
      dispatch(setSelectedMemberIds([...selectedMemberIds, id]));
    } else {
      dispatch(setSelectedMemberIds(selectedMemberIds.filter(memberId => memberId !== id)));
    }
  };

  const isAllSelected = filteredMembers.length > 0 && 
    filteredMembers.every((m: Member) => selectedMemberIds.includes(m.id));

  return (
    <aside className="flex w-96 flex-col border-l bg-card h-full overflow-hidden">
      <div className="flex flex-col p-4 space-y-4 shrink-0">
        <h2 className="text-lg font-semibold">
          Recipients
        </h2>
        <div className="flex flex-col p-4 rounded-lg border bg-muted/50">
          <p className="text-sm font-medium text-muted-foreground">
            Total Selected
          </p>
          <p className="text-3xl font-bold text-primary">{selectedMemberIds.length}</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search recipients..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <div className="space-y-1">
                {/* Country Filter */}
                <Collapsible
                  open={expandedSections.country}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({ ...prev, country: open }))
                  }
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 text-sm font-medium hover:bg-accent">
                    <span>Country</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.country ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pb-2 pt-1 space-y-2">
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.country.includes("USA")}
                        onCheckedChange={() => toggleFilter("country", "USA")}
                      />
                      <span className="text-sm">USA</span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.country.includes("Canada")}
                        onCheckedChange={() => toggleFilter("country", "Canada")}
                      />
                      <span className="text-sm">Canada</span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.country.includes("UK")}
                        onCheckedChange={() => toggleFilter("country", "UK")}
                      />
                      <span className="text-sm">UK</span>
                    </Label>
                  </CollapsibleContent>
                </Collapsible>

                {/* Import/Export Filter */}
                <Collapsible
                  open={expandedSections.type}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({ ...prev, type: open }))
                  }
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 text-sm font-medium hover:bg-accent">
                    <span>Import/Export</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.type ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pb-2 pt-1 space-y-2">
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.type.includes("Import")}
                        onCheckedChange={() => toggleFilter("type", "Import")}
                      />
                      <span className="text-sm">Import</span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.type.includes("Export")}
                        onCheckedChange={() => toggleFilter("type", "Export")}
                      />
                      <span className="text-sm">Export</span>
                    </Label>
                  </CollapsibleContent>
                </Collapsible>

                {/* Mode of Shipment Filter */}
                <Collapsible
                  open={expandedSections.shipment}
                  onOpenChange={(open) =>
                    setExpandedSections((prev) => ({ ...prev, shipment: open }))
                  }
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 text-sm font-medium hover:bg-accent">
                    <span>Mode of Shipment</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedSections.shipment ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pb-2 pt-1 space-y-2">
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.shipment.includes("Air Freight")}
                        onCheckedChange={() => toggleFilter("shipment", "Air Freight")}
                      />
                      <span className="text-sm">Air Freight</span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.shipment.includes("Sea Freight")}
                        onCheckedChange={() => toggleFilter("shipment", "Sea Freight")}
                      />
                      <span className="text-sm">Sea Freight</span>
                    </Label>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div className="flex flex-col gap-3 py-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active filters:</p>
              <Button
                variant="link"
                size="sm"
                onClick={clearAllFilters}
                className="h-auto p-0 text-sm font-medium text-primary hover:underline"
              >
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-1 pr-1 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <span className="capitalize">{filter.category}: {filter.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFilter(filter.category as FilterCategory, filter.value)}
                    className="h-auto p-0.5 rounded-full hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Scrollable Members List */}
      <div className="flex flex-col flex-1 min-h-0 px-4 pb-4">
        <div className="flex items-center justify-between py-2 border-t shrink-0">
          <Label className="flex items-center space-x-3 cursor-pointer">
            <Checkbox 
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">Select All</span>
          </Label>
          <span className="text-sm text-muted-foreground">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        
        <ScrollArea className="h-0 flex-1 mt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-muted-foreground">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No members found' : 'No members available'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 pr-2">
              {filteredMembers.map((member: Member) => (
                <Label 
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                >
                  <Checkbox 
                    checked={selectedMemberIds.includes(member.id)}
                    onCheckedChange={(checked) => handleSelectMember(member.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {member.full_name || `${member.first_name} ${member.last_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email || 'No email'}
                    </p>
                    {member.company_name && (
                      <p className="text-xs text-muted-foreground">{member.company_name}</p>
                    )}
                  </div>
                </Label>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}
