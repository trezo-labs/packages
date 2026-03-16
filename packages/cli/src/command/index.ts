import fs from "node:fs";
import path from "node:path";
import color from "picocolors";
import * as p from "@clack/prompts";
import { setTimeout as sleep } from "node:timers/promises";

import {
  cloneGitHubTemplate,
  copyLocalTemplate,
  isGitHubRepo,
  runPostCommands,
} from "@/lib/utils";
import { PROJECT_NAME_KEY } from "@/lib/constants";
import { presetsArray } from "./presets";

export async function scaffoldCommand(projectNameArg?: string) {
  if (presetsArray.length === 0) {
    p.intro(color.red("No template available to scaffold"));
    p.outro(color.yellow("Please check back later or contribute a template!"));
    process.exit(1);
  }

  p.intro(color.bold("Welcome to Trezo CLI"));

  // Package Selection
  const packageValue = await p.select({
    message: "What package would you like to use?",
    options: presetsArray.map((chain) => ({ ...chain })),
  });
  if (p.isCancel(packageValue)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  const selectedPackage = presetsArray.find(
    (chain) => chain.value === packageValue,
  );
  if (!selectedPackage) {
    p.cancel("Invalid package selected");
    return process.exit(1);
  }

  // Template Selection
  const templateValue = await p.select({
    message: "Select a template:",
    options: selectedPackage.templates.map((template) => ({ ...template })),
  });
  if (p.isCancel(templateValue)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  const selectedTemplate = selectedPackage.templates.find(
    (template) => template.value === templateValue,
  );
  if (!selectedTemplate) {
    p.cancel("Invalid template selected");
    return process.exit(1);
  }

  // Project name setup
  const projectName =
    projectNameArg ||
    ((await p.text({
      message: "Project name:",
      placeholder: PROJECT_NAME_KEY,
      defaultValue: PROJECT_NAME_KEY,
    })) as string);
  if (p.isCancel(projectName) || !projectName) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  // -- Directory handling (overwrite / rename / cancel)
  let finalProjectName = projectName;
  let targetDir = path.resolve(process.cwd(), finalProjectName);

  if (fs.existsSync(targetDir)) {
    const action = await p.select({
      message: `${color.bold(finalProjectName)} already exists. What would you like to do?`,
      options: [
        { value: "overwrite", label: "Overwrite existing project" },
        { value: "rename", label: "Rename project" },
        { value: "cancel", label: "Cancel operation" },
      ],
    });
    if (p.isCancel(action) || action === "cancel") {
      p.cancel("Operation cancelled");
      return process.exit(0);
    }

    if (action === "rename") {
      const newName = (await p.text({
        message: "Enter a new project name:",
      })) as string;
      if (p.isCancel(newName) || !newName) {
        p.cancel("Operation cancelled");
        return process.exit(0);
      }

      finalProjectName = newName;
      targetDir = path.resolve(process.cwd(), finalProjectName);

      if (fs.existsSync(targetDir)) {
        p.cancel("That directory also already exists");
        return process.exit(1);
      }
    }

    if (action === "overwrite") {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  // -- Scaffold project
  const spinner = p.spinner();
  spinner.start(`Scaffolding project in ${targetDir}`);

  try {
    if (isGitHubRepo(selectedTemplate.path)) {
      await cloneGitHubTemplate(selectedTemplate.path, targetDir);
    } else {
      await copyLocalTemplate(selectedTemplate.path, targetDir);
    }
  } catch (err) {
    spinner.stop(
      color.red(
        err instanceof Error ? err.message : "Failed to scaffold project",
      ),
    );
    console.error(err);
    process.exit(1);
  }

  spinner.stop(color.green("Project created successfully!"));

  // Post-setup commands
  if (selectedTemplate.postSetupCommands?.length) {
    const displayCommands = [
      `cd ${finalProjectName}`,
      ...selectedTemplate.postSetupCommands,
    ];

    p.note(
      color.yellow(
        `These commands are optional:\n\n` +
          displayCommands.map((cmd, i) => `${i + 1}. ${cmd}`).join("\n"),
      ),
      "Post-setup commands",
    );

    const shouldRun = await p.confirm({
      message: "Would you like to run these commands now?",
      initialValue: true,
    });
    if (p.isCancel(shouldRun)) {
      p.cancel("Operation cancelled");
      return process.exit(0);
    }

    if (shouldRun) {
      spinner.start();
      try {
        await runPostCommands(selectedTemplate.postSetupCommands, targetDir);
        spinner.stop(color.green("Post-setup complete!"));
      } catch (err) {
        spinner.stop(
          color.red(err instanceof Error ? err.message : "Post-setup failed"),
        );
        console.error(err);
        process.exit(1);
      }
    }
  }

  p.outro(color.bold("You're all set!"));
  await sleep(500);
}
