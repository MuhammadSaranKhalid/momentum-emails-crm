import { z } from "zod"

// Updated member schema based on new requirements
export const memberSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  full_name: z.string().optional(), // Computed from first + last name
  address: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email("Invalid email address"),
  mobile: z.string().optional(),
  company_name: z.string().optional(),
  country: z.string().optional(),
  mode_of_shipment: z.enum(["Air", "Sea", "Both"]).optional(),
  import_export: z.enum(["Import", "Export", "Both"]).optional(),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
})

export type Member = z.infer<typeof memberSchema>

// Create member input schema (excludes auto-generated fields)
export const createMemberSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().optional().or(z.literal('')),
  contact: z.string().optional().or(z.literal('')),
  mobile: z.string().optional().or(z.literal('')),
  company_name: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  mode_of_shipment: z.enum(["Air", "Sea", "Both"]).optional(),
  import_export: z.enum(["Import", "Export", "Both"]).optional(),
})

export type CreateMemberInput = z.infer<typeof createMemberSchema>

// Update member input schema (all fields optional except id)
export const updateMemberSchema = memberSchema
  .omit({
    id: true,
    created_at: true,
    user_id: true,
  })
  .partial()

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

// Mode of shipment options
export const modeOfShipmentOptions = [
  { label: "Air", value: "Air" },
  { label: "Sea", value: "Sea" },
  { label: "Both", value: "Both" },
] as const

// Import/Export options
export const importExportOptions = [
  { label: "Import", value: "Import" },
  { label: "Export", value: "Export" },
  { label: "Both", value: "Both" },
] as const

