import ora from "ora";
import fs from "node:fs";
import chalk from "chalk";
import path from "node:path";
import inquirer from "inquirer";

import {
  cloneGitHubTemplate,
  copyLocalTemplate,
  isGitHubRepo,
  runPostCommands,
} from "../lib/github";
import { version } from "@/package.json";
import { queryPresets } from "./presets";
import { safePrompt } from "../lib/utils";
import { PackageType } from "../lib/schema";
import {
  CHOICES_API_URL,
  CLI_BANNER,
  PROJECT_NAME,
  PROJECT_NAME_RENAME,
} from "../lib/constants";

const sleep = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

export async function scaffoldCommand(projectNameArg?: string) {
  let presetsArray: Array<PackageType> = [];

  // -------------------------
  // Intro
  // -------------------------
  console.log(chalk.cyan(CLI_BANNER));

  const spinner = ora();

  try {
    // -------------------------
    // Fetch Templates
    // -------------------------
    spinner.start("Loading templates... this may take a moment");

    presetsArray = await queryPresets(CHOICES_API_URL);

    if (!presetsArray.length) {
      console.log();
      spinner.fail("No templates available");
      console.log();
      process.exit(0);
    }

    spinner.succeed(chalk.bold(`Welcome to Trezo CLI v${version}\n`));

    // -------------------------
    // Package Selection
    // -------------------------
    const { packageValue } = await safePrompt(() =>
      inquirer.prompt({
        name: "packageValue",
        type: "select",
        message: "What package would you like to use?",
        choices: presetsArray.map((p) => ({
          name: p.label,
          value: p.value,
        })),
      }),
    );

    const selectedPackage = presetsArray.find((p) => p.value === packageValue);

    if (!selectedPackage) {
      console.log();
      spinner.fail("Invalid package selected");
      console.log();
      process.exit(1);
    }

    if (!selectedPackage.templates.length) {
      console.log();
      spinner.fail(`No templates available for "${selectedPackage.label}".`);
      console.log();
      process.exit(0);
    }

    // -------------------------
    // Template Selection
    // -------------------------
    const { templateValue } = await safePrompt(() =>
      inquirer.prompt({
        name: "templateValue",
        type: "select",
        message: "Choose a template to start with:",
        choices: selectedPackage.templates.map((t) => ({
          name: t.label,
          value: t.value,
        })),
      }),
    );

    const selectedTemplate = selectedPackage.templates.find(
      (t) => t.value === templateValue,
    );

    if (!selectedTemplate) {
      console.log();
      spinner.fail("Invalid template selected");
      console.log();
      process.exit(1);
    }

    // -------------------------
    // Project Name
    // -------------------------
    const projectName =
      projectNameArg ||
      (
        await safePrompt(() =>
          inquirer.prompt({
            name: "projectName",
            type: "input",
            message: "What would you like to name your project?",
            default: PROJECT_NAME,
          }),
        )
      ).projectName;

    if (!projectName) {
      console.log();
      spinner.fail("Project name is required");
      console.log();
      process.exit(1);
    }

    let finalProjectName = projectName;
    let targetDir = path.resolve(process.cwd(), finalProjectName);

    // -------------------------
    // Directory Handling
    // -------------------------
    if (fs.existsSync(targetDir)) {
      const { action } = await safePrompt(() =>
        inquirer.prompt({
          name: "action",
          type: "select",
          message: `A directory named "${chalk.cyan(finalProjectName)}" already exists. What would you like to do?`,
          choices: [
            {
              name: "Overwrite existing project",
              value: "overwrite",
            },
            { name: "Rename project", value: "rename" },
            { name: "Cancel operation", value: "cancel" },
          ],
        }),
      );

      if (action === "cancel") {
        console.log();
        spinner.fail("Operation cancelled");
        console.log();
        process.exit(0);
      }

      if (action === "rename") {
        const { newName } = await safePrompt(() =>
          inquirer.prompt({
            name: "newName",
            type: "input",
            message: "What would you like to rename the project to?",
            default: PROJECT_NAME_RENAME,
          }),
        );

        if (!newName) {
          console.log();
          spinner.fail("Operation cancelled");
          console.log();
          process.exit(0);
        }

        finalProjectName = newName;
        targetDir = path.resolve(process.cwd(), finalProjectName);

        if (fs.existsSync(targetDir)) {
          console.log();
          spinner.fail(`Cannot use "${finalProjectName}" as new project name`);
          console.log();
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
    spinner.start(`Creating project in ${chalk.bold(chalk.cyan(targetDir))}`);

    try {
      if (isGitHubRepo(selectedTemplate.path)) {
        await cloneGitHubTemplate(selectedTemplate.path, targetDir);
      } else {
        await copyLocalTemplate(selectedTemplate.path, targetDir);
      }

      spinner.succeed("Project created successfully!");
    } catch (err) {
      spinner.fail(
        err instanceof Error ? err.message : "Failed to create project",
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

      // -------------------------
      // Show commands FIRST
      // -------------------------
      console.log(
        chalk.cyan(
          "\nThe following post-setup commands will complete your project setup:\n",
        ),
      );

      commands.forEach((cmd, i) => {
        console.log(chalk.dim(`  ${i + 1}. ${cmd}`));
      });

      console.log();

      // -------------------------
      // Ask to run them
      // -------------------------
      const { shouldRun } = await safePrompt(() =>
        inquirer.prompt([
          {
            name: "shouldRun",
            type: "confirm",
            message: "Would you like to run these post-setup commands now?",
            default: true,
          },
        ]),
      );

      if (shouldRun) {
        try {
          await runPostCommands(selectedTemplate.postSetupCommands, targetDir);
          spinner.succeed("Post-setup completed successfully.");
        } catch (err) {
          spinner.fail(
            err instanceof Error ? err.message : "Post-setup failed.",
          );
          process.exit(1);
        }
      } else {
        console.log(
          chalk.yellow(
            "\nRun the above commands when you're ready to complete setup.",
          ),
        );
      }
    }

    console.log(chalk.green("\n✔ Project setup complete!\n"));

    await sleep(400);
  } catch (error) {
    const errMsg =
      error instanceof Error
        ? error.message.toLowerCase().includes("fetch")
          ? "Network error: unable to fetch templates."
          : error.message
        : "Unexpected error occurred.";

    spinner.fail(errMsg);
    process.exit(1);
  }
}
