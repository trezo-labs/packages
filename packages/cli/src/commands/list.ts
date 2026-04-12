import color from "picocolors";
import { consola } from "consola";
import { createSpinner } from "nanospinner";
import { queryPresets } from "@/lib/presets.js";
import { CHOICES_API_URL, CLI_BANNER } from "@/lib/constants.js";
import type { PackageType } from "@/lib/schema.js";

export async function listCommand() {
  const spinner = createSpinner();

  let presets: PackageType[];
  console.log(color.cyan(CLI_BANNER));
  spinner.start("This may take a while...");

  try {
    presets = await queryPresets(CHOICES_API_URL);
    if (!presets.length) {
      spinner.error({ text: "No packages found" });
      process.exit(1);
    }
    spinner.success(`Found ${color.bold(presets.length)} package(s)`);
  } catch (error) {
    spinner.error({
      text: error instanceof Error ? error.message : "Failed to fetch packages",
    });
    process.exit(1);
  }

  consola.log("");

  for (const pkg of presets) {
    // Package header
    consola.log(
      color.bold(color.cyan(`${pkg.label}`)) +
        color.dim(` { package: ${pkg.package} }`),
    );

    if (!pkg.templates.length) {
      consola.log(color.dim("  └─ No templates available"));
    } else {
      pkg.templates.forEach((tpl, index) => {
        const isLast = index === pkg.templates.length - 1;
        const prefix = isLast ? "  └─" : "  ├─";

        let line = `${prefix} ${color.green(tpl.name)}`;
        line += color.dim(` → ${tpl.value}`);

        consola.log(line);
      });
    }

    consola.log(""); // spacing between packages
  }

  consola.info(color.bold("Usage: `trezo init -p <package> -t <template>`"));
  consola.log("");
}
