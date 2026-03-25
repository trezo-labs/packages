import { z } from "zod";

// -------------------------
// Template schema
// -------------------------
export const templateSchema = z.object({
  value: z.string().min(1, "Template value is required"),
  label: z.string().min(1, "Template label is required"),
  path: z
    .url("Path must be a valid URL")
    .refine(
      (val) => val.includes("github.com"),
      "Path must be a GitHub repository URL",
    ),
  postSetupCommands: z.array(z.string()).optional(),
});

// -------------------------
// Package (preset) schema
// -------------------------
export const packageSchema = z.object({
  value: z.string().min(1, "Package value is required"),
  label: z.string().min(1, "Package label is required"),
  templates: z.array(templateSchema).min(1, "At least one template required"),
});

// -------------------------
export const presetsSchema = z.array(packageSchema);

// -------------------------
export type TemplateType = z.infer<typeof templateSchema>;
export type PackageType = z.infer<typeof packageSchema>;
