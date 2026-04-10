import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { select, text, confirm, isCancel, spinner, note } from "@clack/prompts";

import {
  cloneGitHubTemplate,
  copyLocalTemplate,
  isGitHubRepo,
  runPostCommands,
} from "../lib/github";
import { queryPresets } from "./presets";
import { PackageType } from "../lib/schema";
import {
  CHOICES_API_URL,
  PROJECT_NAME,
  PROJECT_NAME_RENAME,
} from "../lib/constants";

const sleep = (ms = 400) => new Promise((r) => setTimeout(r, ms));

function handleCancel(message = "Operation cancelled") {
  console.log(chalk.red(`\n✖ ${message}`));
  process.exit(0);
}

export async function scaffoldCommand(projectNameArg?: string) {
  let presetsArray: Array<PackageType> = [];

  const s = spinner();

  try {
    // -------------------------
    // Resolve Templates
    // -------------------------
    s.start("Resolving templates");

    presetsArray = await queryPresets(CHOICES_API_URL);

    if (!presetsArray.length) {
      s.stop("No templates found");
      process.exit(0);
    }

    s.stop("Templates resolved");

    // -------------------------
    // Package Selection
    // -------------------------
    const packageValue = await select({
      message: "Select a package:",
      options: presetsArray.map((p) => ({
        value: p.value,
        label: p.label,
      })),
    });

    if (isCancel(packageValue)) {
      handleCancel();
    }

    const selectedPackage = presetsArray.find((p) => p.value === packageValue);

    if (!selectedPackage) {
      console.log(chalk.red("\nInvalid package selection"));
      process.exit(1);
    }

    if (!selectedPackage.templates.length) {
      console.log(
        chalk.red(`\nNo templates found for "${selectedPackage.label}"`),
      );
      process.exit(0);
    }

    // -------------------------
    // Framework Selection
    // -------------------------
    const frameworkValue = await select({
      message: "Select a framework:",
      options: selectedPackage.templates.map((t) => ({
        value: t.value,
        label: t.label,
        hint: t.hint,
      })),
    });

    if (isCancel(frameworkValue)) {
      handleCancel();
    }

    const selectedTemplate = selectedPackage.templates.find(
      (t) => t.value === frameworkValue,
    );

    if (!selectedTemplate) {
      console.log(chalk.red("\nInvalid template selection"));
      process.exit(1);
    }

    // -------------------------
    // Project Name
    // -------------------------
    let finalProjectName = projectNameArg as string;

    if (!finalProjectName) {
      const inputName = await text({
        message: "Project name:",
        placeholder: PROJECT_NAME,
        defaultValue: PROJECT_NAME,
      });

      if (isCancel(inputName)) {
        handleCancel();
      }

      finalProjectName = inputName as string;
    }

    let targetDir = path.resolve(process.cwd(), finalProjectName);

    // -------------------------
    // Directory Handling
    // -------------------------
    if (fs.existsSync(targetDir)) {
      const action = await select({
        message: `Directory "${chalk.cyan(finalProjectName)}" already exists. Select an action:`,
        options: [
          {
            value: "overwrite",
            label: "Overwrite",
            hint: "Deletes existing folder and creates a new project",
          },
          {
            value: "rename",
            label: "Rename",
            hint: "Choose a different project name",
          },
          {
            value: "cancel",
            label: "Cancel",
            hint: "Exit without making changes",
          },
        ],
      });

      if (isCancel(action)) handleCancel();

      if (action === "cancel") {
        handleCancel("Operation cancelled");
      }

      if (action === "rename") {
        const newName = await text({
          message: "New project name:",
          placeholder: PROJECT_NAME_RENAME,
          defaultValue: PROJECT_NAME_RENAME,
        });

        if (isCancel(newName)) handleCancel();

        finalProjectName = newName as string;
        targetDir = path.resolve(process.cwd(), finalProjectName);

        if (fs.existsSync(targetDir)) {
          console.log(
            chalk.red(`\nDirectory "${finalProjectName}" already exists`),
          );
          process.exit(1);
        }
      }

      if (action === "overwrite") {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
    }

    // -------------------------
    // Scaffold Project
    // -------------------------
    s.start(`Creating project at ${chalk.cyan(targetDir)}`);

    try {
      if (isGitHubRepo(selectedTemplate.path)) {
        await cloneGitHubTemplate(selectedTemplate.path, targetDir);
      } else {
        await copyLocalTemplate(selectedTemplate.path, targetDir);
      }

      s.stop("Project created successfully");
    } catch (err) {
      s.stop(
        chalk.red(
          err instanceof Error ? err.message : "Project creation failed",
        ),
      );
      process.exit(1);
    }

    // -------------------------
    // Post Setup
    // -------------------------
    if (selectedTemplate.postSetupCommands?.length) {
      const commands = [
        `cd ${finalProjectName}`,
        ...selectedTemplate.postSetupCommands,
      ];

      note(
        commands.map((cmd, i) => `${i + 1}. ${cmd}`).join("\n"),
        "Optional post-setup commands:",
      );

      const shouldRun = await confirm({
        message: "Run post-setup commands?",
      });

      if (isCancel(shouldRun)) handleCancel();

      if (shouldRun) {
        s.stop();

        try {
          await runPostCommands(selectedTemplate.postSetupCommands, targetDir);
          s.stop("Post-setup completed");
        } catch (err) {
          s.stop("Post-setup failed");
          process.exit(1);
        }
      }
    }

    await sleep(400);
  } catch (error) {
    const errMsg =
      error instanceof Error
        ? error.message.toLowerCase().includes("fetch")
          ? "Network error: failed to resolve templates"
          : error.message
        : "Unexpected error occurred";

    console.log(chalk.red(`\n✖ ${errMsg}`));
    process.exit(1);
  }
}
