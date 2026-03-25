import fs from "fs";

import { ZodError } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { packageSchema, PackageType } from "../lib/schema";

// ESM helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function queryPresets(
  source: string | unknown[],
): Promise<PackageType[]> {
  let data: unknown[];

  if (Array.isArray(source)) {
    data = source;
  } else if (
    typeof source === "string" &&
    (source.startsWith("http://") || source.startsWith("https://"))
  ) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    data = (await res.json()) as unknown[];
  } else {
    const filePath = resolve(__dirname, source);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Local presets file not found: ${filePath}`);
    }

    data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown[];
  }

  // Normalize templates
  const normalized = (data as any[]).map((preset) => ({
    ...preset,
    templates: (preset.templates || []).map((t: any) => {
      const out = { ...t };

      // normalize postSetupCommands
      if (!out.postSetupCommands) {
        delete out.postSetupCommands;
      } else if (typeof out.postSetupCommands === "string") {
        out.postSetupCommands = [out.postSetupCommands];
      } else if (Array.isArray(out.postSetupCommands)) {
        out.postSetupCommands = out.postSetupCommands.filter(
          (x: unknown) => typeof x === "string",
        );
        if (out.postSetupCommands.length === 0) {
          delete out.postSetupCommands;
        }
      }

      return out;
    }),
  }));

  return validatePresets(normalized);
}

function validatePresets(data: unknown[]): PackageType[] {
  const results: PackageType[] = [];
  const errors: string[] = [];

  data.forEach((item, i) => {
    try {
      results.push(packageSchema.parse(item));
    } catch (err) {
      if (err instanceof ZodError) {
        errors.push(
          `Preset #${i} invalid: ${err.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ")}`,
        );
      } else {
        errors.push(`Preset #${i} invalid: ${String(err)}`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Preset validation failed:\n${errors.join("\n")}`);
  }

  return results;
}
