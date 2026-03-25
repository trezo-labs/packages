import chalk from "chalk";

export async function safePrompt<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err?.name === "ExitPromptError") {
      console.log("\n" + chalk.red("✖ Operation cancelled"));
      process.exit(0);
    }
    throw err;
  }
}
