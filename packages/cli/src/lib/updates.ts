import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { consola } from "consola";
import pc from "picocolors";
import { name, version } from "@/package.json";

const CHECK_INTERVAL = 1000 * 60 * 60 * 1; // 1 hour
const CACHE_FILE = path.join(os.homedir(), ".trezo", "updates.json");

interface Cache {
  lastCheck: number;
}

function readCache(): Cache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCache(data: Cache): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function isPreRelease(version: string): boolean {
  return version.includes("-");
}

async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${packageName}/latest`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

/**
 * Check for updates in the background and notify the user if a newer version exists.
 * Does nothing if run in CI, pre-release, or checked recently.
 */
export async function checkForUpdates(): Promise<void> {
  // Skip in CI environments
  if (process.env.CI) return;

  // Skip for pre-release versions (e.g., beta, canary)
  if (isPreRelease(version)) return;

  const cache = readCache();
  const now = Date.now();

  // Skip if checked within the last 24 hours
  if (cache && now - cache.lastCheck < CHECK_INTERVAL) return;

  // Update cache immediately to prevent concurrent checks
  writeCache({ lastCheck: now });

  const latest = await getLatestVersion(name);
  if (!latest) return;

  // Simple version comparison – if different, assume newer
  if (latest !== version) {
    consola.box({
      title: pc.yellow("⬆️  Update available"),
      message: `${pc.bold(name)} ${pc.yellow(version)} → ${pc.green(latest)}\n\nRun ${pc.cyan(`npm install -g ${name}@latest`)} to update.`,
      style: { borderColor: "yellow" },
    });
  }
}
