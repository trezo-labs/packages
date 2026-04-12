import { z } from "zod";

// -------------------------
// Template schema
// -------------------------
export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  value: z.string().min(1, "Template value is required"),
  hint: z.string().optional(),
  repo: z
    .url("Repo must be a valid URL")
    .refine(
      (val) => val.includes("github.com"),
      "Repo must be a GitHub repository URL",
    ),
  postSetupCommands: z.array(z.string()).nullable().optional(),
});

// -------------------------
// Package schema
// -------------------------
export const packageSchema = z.object({
  package: z.string().min(1, "Package name is required"),
  label: z.string().min(1, "Package label is required"),
  templates: z.array(templateSchema).min(1, "At least one template required"),
});

// -------------------------
export const presetsSchema = z.array(packageSchema);

export type TemplateType = z.infer<typeof templateSchema>;
export type PackageType = z.infer<typeof packageSchema>;
