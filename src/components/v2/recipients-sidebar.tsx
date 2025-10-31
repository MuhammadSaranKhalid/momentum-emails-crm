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

// Filter types
type FilterCategory = "country" | "type" | "shipment";

interface FilterState {
  country: string[];
  type: string[];
  shipment: string[];
}

interface RecipientsSidebarProps {
  members: Member[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableCountries: string[];
}

export function RecipientsSidebar({ 
  members, 
  isLoading,
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  availableCountries
}: RecipientsSidebarProps) {
  const dispatch = useDispatch();
  const selectedMemberIds = useSelector(selectSelectedMemberIds);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    country: true,
    type: true,
    shipment: true,
  });

  // Toggle filter option
  const toggleFilter = (category: FilterCategory, value: string) => {
    const currentValues = filters[category];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onFiltersChange({ ...filters, [category]: newValues });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = members.map((m: Member) => m.id);
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

  const isAllSelected = members.length > 0 && 
    members.every((m: Member) => selectedMemberIds.includes(m.id));

  return (
    <aside className="flex w-96 flex-col border-l bg-card shrink-0 h-full overflow-hidden">
      <div className="flex flex-col p-4 space-y-4 border-b shrink-0 max-h-[40%] overflow-y-auto scrollbar-thin">
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
              onChange={(e) => onSearchChange(e.target.value)}
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
                    {availableCountries.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-2 py-1">No countries available</p>
                    ) : (
                      availableCountries.map((country) => (
                        <Label key={country} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                          <Checkbox
                            checked={filters.country.includes(country)}
                            onCheckedChange={() => toggleFilter("country", country)}
                          />
                          <span className="text-sm">{country}</span>
                        </Label>
                      ))
                    )}
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
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.type.includes("Both")}
                        onCheckedChange={() => toggleFilter("type", "Both")}
                      />
                      <span className="text-sm">Both</span>
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
                        checked={filters.shipment.includes("Air")}
                        onCheckedChange={() => toggleFilter("shipment", "Air")}
                      />
                      <span className="text-sm">Air</span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.shipment.includes("Sea")}
                        onCheckedChange={() => toggleFilter("shipment", "Sea")}
                      />
                      <span className="text-sm">Sea</span>
                    </Label>
                    <Label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-accent">
                      <Checkbox
                        checked={filters.shipment.includes("Both")}
                        onCheckedChange={() => toggleFilter("shipment", "Both")}
                      />
                      <span className="text-sm">Both</span>
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
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <Label className="flex items-center space-x-3 cursor-pointer">
            <Checkbox 
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">Select All</span>
          </Label>
          <span className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        
        <ScrollArea className="h-[calc(100vh-24rem)]">
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Spinner className="h-6 w-6" />
                <p className="text-sm text-muted-foreground">Loading members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No members found' : 'No members available'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member: Member) => (
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
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
