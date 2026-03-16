#!/usr/bin/env node

import { argv } from "process";
import color from "picocolors";

import { name, version } from "@/package.json";
import { scaffoldCommand } from "./command";

async function main() {
  const args = argv.slice(2);

  // Global flags
  if (args.includes("--help") || args.includes("-h")) {
    console.log(color.bold("\nTrezo CLI\n"));
    console.log("Usage:");
    console.log("  npx trezo <command> [options]\n");
    console.log("Commands:");
    console.log("  init  Initialize a new multi-chain Web3 project\n");
    console.log("Options:");
    console.log("  -h, --help      Show this help message");
    console.log("  -v, --version   Show the CLI version\n");
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`${name} v${version}`);
    process.exit(0);
  }

  // Subcommand handling
  const subcommand = args[0];
  const projectNameArg = args[1];

  if (!subcommand) {
    console.log(color.red("No command provided."));
    console.log("Available commands: init");
    console.log("Run `npx trezo --help` for usage info.");
    process.exit(1);
  }

  switch (subcommand) {
    case "init":
      await scaffoldCommand(projectNameArg);
      break;
    default:
      console.log(color.red(`Unknown command: ${subcommand}`));
      console.log("Available commands: init");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
