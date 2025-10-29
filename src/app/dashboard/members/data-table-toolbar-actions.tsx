"use client";

import * as React from "react";
import { Upload, Download } from "lucide-react";
import { useCreate, useGetIdentity, useList } from "@refinedev/core";
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
import type { Member } from "./data/schema";

export function DataTableToolbarActions() {
  const { data: identity } = useGetIdentity<{ id: string }>();
  const { mutate } = useCreate();
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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") return;

      let importedData: any[] = [];
      if (file.name.endsWith(".csv")) {
        importedData = Papa.parse(content, { header: true }).data;
      } else if (file.name.endsWith(".json")) {
        importedData = JSON.parse(content);
      } else {
        toast.error("Unsupported file format. Please use CSV or JSON.");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      importedData.forEach((row: any) => {
        // Map imported data to new schema
        const newMemberData = {
          first_name: row["First Name"] || row.first_name || "",
          last_name: row["Last Name"] || row.last_name || "",
          email: row["Email"] || row.email || "",
          contact: row["Contact"] || row.contact || "",
          mobile: row["Mobile"] || row.mobile || "",
          company_name: row["Company Name"] || row.company_name || "",
          address: row["Address"] || row.address || "",
          country: row["Country"] || row.country || "",
          import_export: row["Import/Export"] || row.import_export || undefined,
          mode_of_shipment: row["Mode Of Shipment"] || row.mode_of_shipment || undefined,
          user_id: identity?.id,
        };

        // Only import if required fields are present
        if (newMemberData.first_name && newMemberData.last_name && newMemberData.email) {
          mutate(
            {
              resource: "members",
              values: newMemberData,
            },
            {
              onSuccess: () => { successCount++; },
              onError: () => { errorCount++; },
            }
          );
        } else {
          errorCount++;
        }
      });

      // Show result toast after a brief delay to allow mutations to complete
      setTimeout(() => {
        if (successCount > 0) {
          toast.success(`${successCount} member(s) imported successfully`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} member(s) failed to import`);
        }
      }, 1000);
    };
    reader.readAsText(file);
    
    // Reset input to allow re-importing the same file
    event.target.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <CreateMemberDialog />
      <input
        type="file"
        id="import-button"
        className="hidden"
        onChange={handleImport}
        accept=".csv, .json"
      />
      <Button asChild variant="outline">
        <label htmlFor="import-button" className="cursor-pointer">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </label>
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

