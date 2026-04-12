import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import consola from "consola";
import prompts from "prompts";
import { PROJECT_NAME } from "../lib/constants";
import { PackageType, TemplateType } from "../lib/schema";
import { createSpinner } from "nanospinner";
import { cloneGitHubTemplate, isGitHubRepo } from "../lib/github";

export function onCancel() {
  consola.error(pc.red("Operation cancelled"));
  process.exit(0);
}

export async function resolveProjectName(
  initialName?: string,
): Promise<string> {
  if (initialName) return initialName;

  const response = await prompts(
    {
      type: "text",
      name: "value",
      message: "Project directory",
      initial: PROJECT_NAME,
    },
    { onCancel },
  );
  return response.value.trim();
}

export async function handleExistingDirectory(
  targetDir: string,
  currentName: string,
): Promise<string> {
  if (!fs.existsSync(targetDir)) return targetDir;

  const action = await prompts(
    {
      type: "select",
      name: "value",
      message: `Directory "${pc.cyan(currentName)}" already exists. Choose an action`,
      choices: [
        {
          title: "Overwrite",
          value: "overwrite",
          description: "Delete and recreate",
        },
        { title: "Rename", value: "rename", description: "Choose a new name" },
        { title: "Cancel", value: "cancel", description: "Exit" },
      ],
    },
    { onCancel },
  );

  if (action.value === "cancel") onCancel();

  if (action.value === "rename") {
    const renameResponse = await prompts(
      {
        type: "text",
        name: "value",
        message: "New directory name",
        initial: currentName,
      },
      { onCancel },
    );
    const newName = renameResponse.value.trim();
    const newDir = path.resolve(process.cwd(), newName);
    if (fs.existsSync(newDir)) {
      consola.error(pc.red(`Directory "${newName}" still exists.`));
      process.exit(1);
    }
    return newDir;
  }

  if (action.value === "overwrite") {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  return targetDir;
}

export async function selectPackage(
  presets: PackageType[],
  packageFlag?: string,
): Promise<PackageType> {
  if (packageFlag) {
    const found = presets.find((p) => p.package === packageFlag);
    if (!found) {
      consola.error(pc.red(`Unknown package "${packageFlag}".`));
      consola.info("Available packages:");
      presets.forEach((p) => consola.log(`  ${pc.cyan(p.package)}`));
      process.exit(1);
    }
    consola.log(pc.dim(`Using package: ${found.package}`));
    return found;
  }

  const response = await prompts(
    {
      type: "select",
      name: "value",
      message: "Select a package",
      choices: presets.map((p) => ({ title: p.label, value: p.package })),
    },
    { onCancel },
  );
  return presets.find((p) => p.package === response.value)!;
}

export async function selectTemplate(
  selectedPackage: PackageType,
  templateFlag?: string,
): Promise<TemplateType> {
  // Guard against empty templates (should not happen per schema, but defensive)
  if (!selectedPackage.templates.length) {
    consola.error(
      pc.red(`No templates available for "${selectedPackage.label}".`),
    );
    process.exit(1);
  }

  if (templateFlag) {
    const found = selectedPackage.templates.find(
      (t) => t.value === templateFlag,
    );
    if (!found) {
      consola.error(
        pc.red(
          `Unknown template "${templateFlag}" for package "${selectedPackage.package}".`,
        ),
      );
      consola.info("Available templates:");
      selectedPackage.templates.forEach((t) =>
        consola.log(
          `  ${pc.cyan(t.value)} ${t.hint ? pc.dim(`(${t.hint})`) : ""}`,
        ),
      );
      process.exit(1);
    }
    consola.log(pc.dim(`Using template: ${found.name}`));
    return found;
  }

  const response = await prompts(
    {
      type: "select",
      name: "value",
      message: "Choose a template",
      choices: selectedPackage.templates.map((t) => ({
        title: t.name,
        value: t.value,
        description: t.hint,
      })),
    },
    { onCancel },
  );
  return selectedPackage.templates.find((t) => t.value === response.value)!;
}

export async function scaffoldProject(
  template: TemplateType,
  targetDir: string,
) {
  const spinner = createSpinner("Downloading template").start();

  try {
    if (isGitHubRepo(template.repo)) {
      await cloneGitHubTemplate(template.repo, targetDir);
    } else {
      throw new Error("Only GitHub templates are supported.");
    }
    spinner.success(`Downloaded ${pc.cyan(template.name)} template.`);
  } catch (err) {
    spinner.error({
      text: err instanceof Error ? err.message : "Project creation failed",
    });
    process.exit(1);
  }
}
