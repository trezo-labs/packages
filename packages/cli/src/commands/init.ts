import {
  selectPackage,
  selectTemplate,
  scaffoldProject,
  resolveProjectName,
  handleExistingDirectory,
} from "@/helpers/index.js";
import pc from "picocolors";
import path from "node:path";
import { consola } from "consola";
import { version } from "@/package.json";
import { createSpinner } from "nanospinner";
import { queryPresets } from "@/lib/presets.js";
import type { PackageType } from "@/lib/schema.js";
import { CHOICES_API_URL, CLI_BANNER } from "@/lib/constants.js";

// ------------------------------------------------------------------
// Main command
// ------------------------------------------------------------------
export async function initCommand(
  projectNameArg?: string,
  options?: { package?: string; template?: string },
) {
  // ----- 1. Fetch presets (with spinner) -----
  const spinner = createSpinner();
  let presets: PackageType[];

  console.log(pc.cyan(CLI_BANNER));
  consola.log(pc.dim(`Welcome to Trezo CLI v${version}`));
  consola.info("Initializing new project");

  try {
    presets = await queryPresets(CHOICES_API_URL);
    if (!presets.length) {
      spinner.error({ text: "No templates found" });
      process.exit(1);
    }
    spinner.stop();
  } catch (error) {
    spinner.error({
      text:
        error instanceof Error ? error.message : "Failed to fetch templates",
    });
    process.exit(1);
  }

  // ----- 2. Resolve package and template EARLY (logs "Using ..." immediately) -----
  const selectedPackage = await selectPackage(presets, options?.package);
  const selectedTemplate = await selectTemplate(
    selectedPackage,
    options?.template,
  );

  // ----- 3. Now handle project directory (no more "Using..." logs after this) -----
  const finalProjectName = await resolveProjectName(projectNameArg);
  let targetDir = path.resolve(process.cwd(), finalProjectName);
  targetDir = await handleExistingDirectory(targetDir, finalProjectName);

  // ----- 4. Scaffold -----
  await scaffoldProject(selectedTemplate, targetDir);

  // ----- 5. Final output (NO cd command) -----
  const postCommands = selectedTemplate.postSetupCommands;

  consola.log(
    `\n✨ Trezo project created with the ${pc.cyan(selectedPackage.package)} package.\n`,
  );

  if (postCommands && postCommands.length > 0) {
    const nextSteps = [`cd ${finalProjectName}`, ...postCommands];

    consola.log(pc.bold("Next steps:"));

    nextSteps.forEach((cmd, i) => {
      consola.log(`  ${i + 1}. ${pc.cyan(cmd)}`);
    });

    consola.log("");
  }
}
