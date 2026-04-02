import { ExplorerKey, explorers } from "../modalsFrom/starknetkit";

export function resolveExplorer(key?: ExplorerKey) {
  if (!key) return undefined;
  return explorers[key];
}
