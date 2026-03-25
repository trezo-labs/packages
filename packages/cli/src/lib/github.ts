import fs from "node:fs";
import path from "node:path";
import degit from "degit";
import { spawn } from "node:child_process";

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

  // Handle /tree/ URLs
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

  await emitter.clone(targetDir);
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
