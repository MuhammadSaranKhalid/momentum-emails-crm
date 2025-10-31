'use client';

import * as React from 'react';
import { useList, useGetIdentity, useCreateMany } from '@refinedev/core';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import { Users, Upload } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

import { columns as memberColumns } from './columns';
import { DataTable } from '@/components/data-table/data-table';
import { CreateMemberDialog } from './create-member-dialog';
import { Member } from './data/schema';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { DataTableToolbarActions } from './data-table-toolbar-actions';
import { DashboardHeader } from '@/components/dashboard-header';

const PAGE_SIZE = 10;

export default function MembersPage() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [isImporting, setIsImporting] = React.useState(false);
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { mutate: createMany } = useCreateMany();

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

  // Helper function to extract email from formatted string
  const extractEmail = (emailString: string): string => {
    if (!emailString) return "";
    const emailMatch = emailString.match(/<([^>]+)>/);
    if (emailMatch) return emailMatch[1].trim();
    return emailString.trim();
  };

  // Helper function to normalize mode of shipment
  const normalizeModeOfShipment = (mode: string): string | undefined => {
    if (!mode) return undefined;
    const modeUpper = mode.toUpperCase().trim();
    if (modeUpper.includes("AIR") && modeUpper.includes("SEA")) return "Both";
    if (modeUpper === "AIR") return "Air";
    if (modeUpper === "SEA") return "Sea";
    if (mode === "Air" || mode === "Sea" || mode === "Both") return mode;
    return undefined;
  };

  // Helper function to normalize import/export
  const normalizeImportExport = (value: string): string | undefined => {
    if (!value) return undefined;
    const valueUpper = value.toUpperCase().trim();
    if (valueUpper.includes("IMPORT") && valueUpper.includes("EXPORT")) return "Both";
    if (valueUpper === "IMPORT") return "Import";
    if (valueUpper === "EXPORT") return "Export";
    if (value === "Import" || value === "Export" || value === "Both") return value;
    return undefined;
  };

  const processImportedData = (importedData: Record<string, unknown>[]) => {
    const validMembers: Array<{
      first_name: string;
      last_name: string;
      email: string;
      contact: string | null;
      mobile: string | null;
      company_name: string | null;
      address: string | null;
      country: string | null;
      import_export: string | null;
      mode_of_shipment: string | null;
      user_id: string | undefined;
    }> = [];
    const errors: string[] = [];

    importedData.forEach((row: Record<string, unknown>, index: number) => {
      if (!row || Object.keys(row).length === 0) return;

      let firstName = String(row["First Name"] || row.first_name || "");
      let lastName = String(row["Last Name"] || row.last_name || "");
      const fullName = String(row["Full Name"] || row.full_name || "");
      const rawEmail = String(row["Email"] || row.email || "");
      const email = extractEmail(rawEmail);

      if ((!firstName || !lastName) && fullName) {
        const nameParts = fullName.trim().split(" ");
        if (nameParts.length >= 2) {
          firstName = firstName || nameParts[0];
          lastName = lastName || nameParts.slice(1).join(" ");
        } else if (nameParts.length === 1) {
          firstName = firstName || nameParts[0];
          lastName = lastName || nameParts[0];
        }
      }

      if ((!firstName || !lastName) && email) {
        const emailUsername = email.split("@")[0];
        const emailParts = emailUsername.split(/[._-]/);
        if (emailParts.length >= 2) {
          firstName = firstName || emailParts[0];
          lastName = lastName || emailParts.slice(1).join(" ");
        } else {
          firstName = firstName || emailUsername;
          lastName = lastName || emailUsername;
        }
      }

      if (!firstName) firstName = "Unknown";
      if (!lastName) lastName = "User";

      const modeOfShipment = normalizeModeOfShipment(
        String(row["Mode Of Shipment"] || row.mode_of_shipment || "")
      );

      const importExport = normalizeImportExport(
        String(row["Import/Export"] || row.import_export || "")
      );

      const newMemberData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email,
        contact: String(row["Contact"] || row.contact || "").trim() || null,
        mobile: String(row["Mobile"] || row.mobile || "").trim() || null,
        company_name: String(row["Company Name"] || row.company_name || "").trim() || null,
        address: String(row["Address"] || row.address || "").trim() || null,
        country: String(row["Country"] || row.country || "").trim() || null,
        import_export: importExport || null,
        mode_of_shipment: modeOfShipment || null,
        user_id: identity?.id,
      };

      if (newMemberData.email) {
        validMembers.push(newMemberData);
      } else {
        errors.push(`Row ${index + 1}: Missing required field: Email`);
      }
    });

    if (validMembers.length === 0) {
      toast.error("No valid members to import");
      if (errors.length > 0) console.error("Import errors:", errors);
      return;
    }

    setIsImporting(true);
    toast.info(`Importing ${validMembers.length} member(s)...`);

    createMany(
      {
        resource: "members",
        values: validMembers,
      },
      {
        onSuccess: (data) => {
          setIsImporting(false);
          const successCount = data?.data?.length || validMembers.length;
          toast.success(`${successCount} member(s) imported successfully`);
          if (errors.length > 0) {
            toast.warning(`${errors.length} row(s) skipped due to validation errors.`);
            console.error("Validation errors:", errors);
          }
        },
        onError: (error) => {
          setIsImporting(false);
          console.error('Import error:', error);
          toast.error(`Failed to import members: ${error.message || 'Unknown error'}`);
        },
      }
    );
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) return;

        try {
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const importedData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          processImportedData(importedData);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content !== "string") return;

        let importedData: Record<string, unknown>[] = [];
        try {
          if (file.name.endsWith(".csv")) {
            importedData = Papa.parse(content, { header: true }).data as Record<string, unknown>[];
          } else if (file.name.endsWith(".json")) {
            importedData = JSON.parse(content) as Record<string, unknown>[];
          } else {
            toast.error("Unsupported file format. Please use CSV, Excel, or JSON.");
            return;
          }
          processImportedData(importedData);
        } catch (error) {
          console.error("Error parsing file:", error);
          toast.error("Failed to parse file");
        }
      };
      reader.readAsText(file);
    }
    
    event.target.value = "";
  };

  // Header Actions
  const headerActions = <DataTableToolbarActions />;

  // Error state
  if (isError) {
    return (
      <>
        <DashboardHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Agents' }
          ]}
        />
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
      </>
    );
  }

  // Empty state
  if (!isLoading && members.length === 0) {
    return (
      <>
        <DashboardHeader 
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Agents' }
          ]}
          actions={headerActions}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No members yet</EmptyTitle>
              <EmptyDescription>
                Create your first member or import from a file to start managing your contacts and clients.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex items-center gap-2">
                <CreateMemberDialog />
                <input
                  type="file"
                  id="empty-import-button"
                  className="hidden"
                  onChange={handleImport}
                  accept=".csv, .xlsx, .xls, .json"
                  disabled={isImporting}
                />
                <Button 
                  variant="outline" 
                  disabled={isImporting}
                  onClick={() => !isImporting && document.getElementById('empty-import-button')?.click()}
                >
                  {isImporting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </>
                  )}
                </Button>
              </div>
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
          { label: 'Agents' }
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
            data={members}
            columns={columns}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        )}
      </div>
    </>
  );
}

