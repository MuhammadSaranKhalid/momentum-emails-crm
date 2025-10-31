"use client";

import * as React from "react";
import { Upload, Download } from "lucide-react";
import { useGetIdentity, useList, useCreateMany } from "@refinedev/core";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateMemberDialog } from "./create-member-dialog";
import { Spinner } from "@/components/ui/spinner";
import type { Member } from "./data/schema";

export function DataTableToolbarActions() {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { mutate: createMany } = useCreateMany();
  const [isImporting, setIsImporting] = React.useState(false);
  const { result: members } = useList<Member>({ 
    resource: "members",
    pagination: { mode: "off" }
  });

  const handleExport = (format: "csv" | "xlsx" | "json") => {
    if (!members?.data) {
      toast.error("No data to export");
      return;
    }

    const data = members.data.map((member) => ({
      "First Name": member.first_name,
      "Last Name": member.last_name,
      "Full Name": member.full_name || `${member.first_name} ${member.last_name}`,
      "Email": member.email,
      "Contact": member.contact || "",
      "Mobile": member.mobile || "",
      "Company Name": member.company_name || "",
      "Address": member.address || "",
      "Country": member.country || "",
      "Import/Export": member.import_export || "",
      "Mode Of Shipment": member.mode_of_shipment || "",
    }));

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === "csv") {
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `members-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Members exported as CSV");
    } else if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = { Sheets: { Members: worksheet }, SheetNames: ["Members"] };
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `members-${timestamp}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Members exported as Excel");
    } else if (format === "json") {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `members-${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Members exported as JSON");
    }
  };

  // Helper function to extract email from formatted string
  const extractEmail = (emailString: string): string => {
    if (!emailString) return "";
    
    // Check if email is in format: "Name (Company) <email@domain.com>"
    const emailMatch = emailString.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1].trim();
    }
    
    // Return as is if it's already a plain email
    return emailString.trim();
  };

  // Helper function to normalize mode of shipment
  const normalizeModeOfShipment = (mode: string): string | undefined => {
    if (!mode) return undefined;
    
    const modeUpper = mode.toUpperCase().trim();
    
    // Check for "Both" patterns
    if (modeUpper.includes("AIR") && modeUpper.includes("SEA")) {
      return "Both";
    }
    
    // Check for "Air" only
    if (modeUpper === "AIR") {
      return "Air";
    }
    
    // Check for "Sea" only
    if (modeUpper === "SEA") {
      return "Sea";
    }
    
    // Return original if it matches our enum
    if (mode === "Air" || mode === "Sea" || mode === "Both") {
      return mode;
    }
    
    return undefined;
  };

  // Helper function to normalize import/export
  const normalizeImportExport = (value: string): string | undefined => {
    if (!value) return undefined;
    
    const valueUpper = value.toUpperCase().trim();
    
    // Check for "Both" patterns
    if (valueUpper.includes("IMPORT") && valueUpper.includes("EXPORT")) {
      return "Both";
    }
    
    // Check for "Import" only
    if (valueUpper === "IMPORT") {
      return "Import";
    }
    
    // Check for "Export" only
    if (valueUpper === "EXPORT") {
      return "Export";
    }
    
    // Return original if it matches our enum
    if (value === "Import" || value === "Export" || value === "Both") {
      return value;
    }
    
    return undefined;
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    // Handle Excel files separately
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
      // Handle CSV and JSON files
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
    
    // Reset input to allow re-importing the same file
    event.target.value = "";
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

    // First pass: Collect all valid members
    importedData.forEach((row: Record<string, unknown>, index: number) => {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) return;

      // Extract and clean data with type safety
      let firstName = String(row["First Name"] || row.first_name || "");
      let lastName = String(row["Last Name"] || row.last_name || "");
      const fullName = String(row["Full Name"] || row.full_name || "");
      
      // Extract email from potentially formatted string first (we might need it for fallback)
      const rawEmail = String(row["Email"] || row.email || "");
      const email = extractEmail(rawEmail);
      
      // If first or last name is missing, try to split full name
      if ((!firstName || !lastName) && fullName) {
        const nameParts = fullName.trim().split(" ");
        if (nameParts.length >= 2) {
          firstName = firstName || nameParts[0];
          lastName = lastName || nameParts.slice(1).join(" ");
        } else if (nameParts.length === 1) {
          // If only one name part, use it for both
          firstName = firstName || nameParts[0];
          lastName = lastName || nameParts[0];
        }
      }
      
      // If still no first/last name, use email username as fallback
      if ((!firstName || !lastName) && email) {
        const emailUsername = email.split("@")[0];
        const emailParts = emailUsername.split(/[._-]/); // Split by common separators
        
        if (emailParts.length >= 2) {
          firstName = firstName || emailParts[0];
          lastName = lastName || emailParts.slice(1).join(" ");
        } else {
          // Use email username for both if we can't split it
          firstName = firstName || emailUsername;
          lastName = lastName || emailUsername;
        }
      }
      
      // Final fallback: use "Unknown" if still empty
      if (!firstName) firstName = "Unknown";
      if (!lastName) lastName = "User";

      // Normalize mode of shipment
      const modeOfShipment = normalizeModeOfShipment(
        String(row["Mode Of Shipment"] || row.mode_of_shipment || "")
      );

      // Normalize import/export
      const importExport = normalizeImportExport(
        String(row["Import/Export"] || row.import_export || "")
      );

      // Map imported data to new schema
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

      // Only add if email is present
      if (newMemberData.email) {
        validMembers.push(newMemberData);
      } else {
        errors.push(`Row ${index + 1}: Missing required field: Email`);
      }
    });

    // If no valid members, show error and return
    if (validMembers.length === 0) {
      toast.error("No valid members to import");
      if (errors.length > 0) {
        console.error("Import errors:", errors);
      }
      return;
    }

    // Show initial progress and set loading state
    setIsImporting(true);
    toast.info(`Importing ${validMembers.length} member(s)...`);

    // Use Refine's useCreateMany hook for bulk insert
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
            toast.warning(`${errors.length} row(s) skipped due to validation errors. Check console for details.`);
            console.error("Validation errors:", errors);
          }
        },
        onError: (error) => {
          setIsImporting(false);
          console.error('Import error:', error);
          toast.error(`Failed to import members: ${error.message || 'Unknown error'}`);
          if (errors.length > 0) {
            console.error("Validation errors:", errors);
          }
        },
      }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <CreateMemberDialog />
      <input
        type="file"
        id="import-button"
        className="hidden"
        onChange={handleImport}
        accept=".csv, .xlsx, .xls, .json"
        disabled={isImporting}
      />
      <Button 
        variant="outline" 
        disabled={isImporting}
        onClick={() => !isImporting && document.getElementById('import-button')?.click()}
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleExport("csv")}>
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("xlsx")}>
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("json")}>
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

