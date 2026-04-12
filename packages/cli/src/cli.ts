#!/usr/bin/env node

import { cac } from "cac";
import color from "picocolors";
import { consola } from "consola";
import { name, version } from "@/package.json";
import { initCommand } from "./commands/init";
import { listCommand } from "./commands/list";
import { checkForUpdates } from "./lib/updates";

// Start update check in the background (non-blocking)
checkForUpdates();

const cli = cac(name);

// Enable global --help and --version flags
cli.version(version);
cli.help();

cli
  .command("init", "Initialize a new Trezo project")
  .option("-n, --name <name>", "Project directory name (prompts if omitted)")
  .option(
    "-p, --package <name>",
    "Skip package selection and use this package ID",
  )
  .option(
    "-t, --template <name>",
    "Skip template selection and use this template ID",
  )
  .action(
    async (options?: {
      name?: string;
      package?: string;
      template?: string;
    }) => {
      await initCommand(options?.name, {
        package: options?.package,
        template: options?.template,
      });
    },
  );

cli
  .command("list", "List all available packages and templates")
  .action(async () => await listCommand());

// Global error handling for unknown commands
cli.command("").action(() => cli.outputHelp());

// Catch-all for unknown commands
cli.command("*").action(() => {
  consola.error(color.red("Unknown command."));
  consola.info("Run `" + color.bold(name + " --help") + "` for usage.");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  consola.warn(color.red("\n✖ Operation cancelled"));
  process.exit(0);
});

process.on("SIGTERM", () => {
  consola.warn(color.red("\n✖ Process terminated"));
  process.exit(0);
});

cli.parse();
