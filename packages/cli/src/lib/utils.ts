import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import whichPMRuns from "which-pm-runs";
import degit from "degit";
import { spawn } from "node:child_process";

export function getPm(): string {
  const pm: string = whichPMRuns()?.name || "npm";
  return pm;
}

export function exitTerminal(
  condition: boolean,
  message: string = "Operation cancelled",
): void {
  if (condition) {
    p.cancel(message);
    process.exit(1);
  }
}

export function isGitHubRepo(pathValue: string): boolean {
  return pathValue.startsWith("http");
}

export async function copyLocalTemplate(
  templatePath: string,
  targetDir: string,
) {
  const fullTemplatePath = path.resolve(__dirname, "..", templatePath);

  if (!fs.existsSync(fullTemplatePath)) {
    throw new Error(`Template not found at ${fullTemplatePath}`);
  }

  fs.cpSync(fullTemplatePath, targetDir, { recursive: true });
}

export async function cloneGitHubTemplate(repoUrl: string, targetDir: string) {
  const emitter = degit(repoUrl, {
    cache: false,
    force: true,
    verbose: false,
  });

  await emitter.clone(targetDir);
}

export async function runPostCommands(commands: string[], projectDir: string) {
  for (const cmd of commands) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, {
        cwd: projectDir,
        stdio: "inherit",
        shell: true,
      });

      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed: ${cmd}`));
      });
    });
  }
}
