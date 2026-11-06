import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SourceSnapshot } from "./adapters.js";

export interface SnapshotState {
  version: 1;
  snapshots: Record<string, SourceSnapshot>;
}

export async function readSnapshotState(path: string): Promise<SnapshotState> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as SnapshotState;
    if (parsed.version !== 1 || typeof parsed.snapshots !== "object") {
      throw new Error("Unsupported snapshot state format");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, snapshots: {} };
    }
    throw error;
  }
}

export async function writeSnapshotState(
  path: string,
  state: SnapshotState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tempPath, path);
}
