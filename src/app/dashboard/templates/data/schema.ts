import { z } from "zod"

// Template schema
export const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  html_content: z.string().min(1, "Content is required"),
  category: z.enum(["Newsletter", "Marketing", "Transactional", "Announcement", "Other"]).optional(),
  is_favorite: z.boolean().default(false),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
})

export type Template = z.infer<typeof templateSchema>

// Create template input schema
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional().or(z.literal('')),
  subject: z.string().min(1, "Subject is required"),
  html_content: z.string().min(1, "Content is required"),
  category: z.enum(["Newsletter", "Marketing", "Transactional", "Announcement", "Other"]).optional(),
  is_favorite: z.boolean().default(false),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

// Update template input schema
export const updateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
  description: z.string().optional().or(z.literal('')),
  subject: z.string().min(1, "Subject is required").optional(),
  html_content: z.string().min(1, "Content is required").optional(),
  category: z.enum(["Newsletter", "Marketing", "Transactional", "Announcement", "Other"]).optional(),
  is_favorite: z.boolean().optional(),
}).partial()

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

// Category options
export const categoryOptions = [
  { label: "Newsletter", value: "Newsletter" },
  { label: "Marketing", value: "Marketing" },
  { label: "Transactional", value: "Transactional" },
  { label: "Announcement", value: "Announcement" },
  { label: "Other", value: "Other" },
] as const

// Category colors for badges
export const categoryColors: Record<string, string> = {
  Newsletter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Marketing: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Transactional: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  Announcement: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
}

