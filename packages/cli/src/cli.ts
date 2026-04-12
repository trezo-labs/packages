#!/usr/bin/env node

import { cac } from "cac";
import color from "picocolors";
import { consola } from "consola";
import { name } from "@/package.json";
import { initCommand } from "./commands/init";
import { listCommand } from "./commands/list";

const cli = cac(name);

cli
  .command("init", "Initialize a new multi-chain Web3 project")
  .option("-n, --name <name>", "Project name")
  .option("-p, --package <name>", "Skip package selection and use this package")
  .option(
    "-t, --template <name>",
    "Skip template selection and use this template",
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
