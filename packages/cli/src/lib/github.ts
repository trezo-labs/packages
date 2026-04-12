import fs from "node:fs";
import degit from "degit";

export function isGitHubRepo(pathValue: string): boolean {
  return pathValue.startsWith("https://github.com/");
}

export async function cloneGitHubTemplate(repoUrl: string, targetDir: string) {
  let degitPath = repoUrl;

  if (repoUrl.includes("/tree/")) {
    const match = repoUrl.match(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/,
    );
    if (!match) throw new Error("Invalid GitHub tree URL");
    const [, owner, repo, branch, subdir] = match;
    degitPath = `${owner}/${repo}/${subdir}#${branch}`;
  }

  const emitter = degit(degitPath, {
    cache: false,
    force: true,
    verbose: false,
  });

  try {
    await emitter.clone(targetDir);
  } catch (err) {
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
