#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { intro, outro } from "@clack/prompts";
import { name, version } from "@/package.json";
import { scaffoldCommand } from "./command/scaffold";
import { CLI_BANNER } from "./lib/constants";

const program = new Command();

// -------------------------
// Global config
// -------------------------
program
  .name(name)
  .description("Trezo CLI")
  .version(version, "-v, --version", "Show CLI version");

// -------------------------
// init command
// -------------------------
program
  .command("init")
  .argument("[project-name]", "Name of your project")
  .description("Initialize a new multi-chain Web3 project")
  .action(async (projectName) => {
    console.log(chalk.cyan(CLI_BANNER));
    intro(chalk.cyan(`Welcome to Trezo CLI v${version}`));
    await scaffoldCommand(projectName);
    outro(chalk.green("✔ You're all set — time to ship 🚀"));
  });

// -------------------------
// Unknown command handling
// -------------------------
program.on("command:*", () => {
  console.log(chalk.red("Unknown command."));
  console.log("Run `trezo --help` for usage.");
  process.exit(1);
});

// -------------------------
// Global exit handling
// -------------------------
process.on("SIGINT", () => {
  console.log("\n" + chalk.red("✖ Operation cancelled"));
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n" + chalk.red("✖ Process terminated"));
  process.exit(0);
});

// -------------------------
program.parse(process.argv);
