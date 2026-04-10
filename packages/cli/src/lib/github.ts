import fs from "node:fs";
import path from "node:path";
import degit from "degit";
import { ChildProcess, spawn } from "node:child_process";

export function isGitHubRepo(pathValue: string): boolean {
  return pathValue.startsWith("https://github.com/");
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
  let degitPath = repoUrl;

  if (repoUrl.includes("/tree/")) {
    const parsed = parseGitHubTreeUrl(repoUrl);

    if (!parsed) {
      throw new Error("Invalid GitHub tree URL");
    }

    degitPath = parsed.degitPath;
  }

  const emitter = degit(degitPath, {
    cache: false,
    force: true,
    verbose: false,
  });

  try {
    await emitter.clone(targetDir);
  } catch (err) {
    // cleanup partial folder
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    throw new Error(
      err instanceof Error
        ? `Failed to clone template: ${err.message}`
        : "Failed to clone template",
    );
  }
}

export function parseGitHubTreeUrl(url: string) {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/,
  );

  if (!match) return null;

  const [, owner, repo, branch, subdir] = match;

  return {
    degitPath: `${owner}/${repo}/${subdir}#${branch}`,
  };
}

export async function runPostCommands(commands: string[], projectDir: string) {
  let activeProcess: ChildProcess | null = null;

  const killActive = () => {
    if (activeProcess && !activeProcess.killed) {
      activeProcess.kill("SIGTERM");
      activeProcess = null;
    }
  };

  process.on("SIGINT", () => {
    killActive();
    console.log("\n✖ Post-setup cancelled");
    process.exit(0);
  });

  try {
    for (const cmd of commands) {
      await new Promise<void>((resolve, reject) => {
        activeProcess = spawn(cmd, {
          cwd: projectDir,
          stdio: "inherit",
          shell: true,
        });

        activeProcess.on("close", (code) => {
          activeProcess = null;

          if (code === 0) resolve();
          else reject(new Error(`Command failed: ${cmd}`));
        });

        activeProcess.on("error", (err) => {
          activeProcess = null;
          reject(err);
        });
      });
    }
  } finally {
    killActive();
  }
}
