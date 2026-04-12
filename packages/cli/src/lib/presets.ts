import { ZodError } from "zod";
import { packageSchema, type PackageType } from "./schema.js";

function formatPresetError(
  rawPreset: any,
  index: number,
  error: ZodError,
): string {
  const identifier = rawPreset?.label || rawPreset?.package || `#${index + 1}`;

  const messages = error.issues.map((issue) => {
    const field = issue.path.length ? issue.path.join(".") : "root";
    return `${field}: ${issue.message}`;
  });

  return `Package ${identifier} is invalid: ${messages.join("; ")}`;
}

export async function queryPresets(sourceUrl: string): Promise<PackageType[]> {
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch npm packages (HTTP ${response.status})`);
  }

  const data = (await response.json()) as unknown[];

  const results: PackageType[] = [];
  const errors: string[] = [];

  data.forEach((item: any, i) => {
    try {
      results.push(packageSchema.parse(item));
    } catch (err) {
      if (err instanceof ZodError) {
        errors.push(formatPresetError(item, i, err));
      } else {
        const identifier = item?.label || item?.package || `#${i + 1}`;
        errors.push(`Package ${identifier} is invalid: ${String(err)}`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Invalid npm packages:\n${errors.join("\n")}`);
  }

  return results;
}
