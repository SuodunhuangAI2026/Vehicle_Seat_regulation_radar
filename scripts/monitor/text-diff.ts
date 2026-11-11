import type { RegulationSection } from "./regulation-downloader.js";

export interface SectionDiff {
  sectionId: string;
  sectionTitle: string;
  changeType: "added" | "removed" | "modified" | "unchanged";
  oldContent?: string;
  newContent?: string;
  oldDiffHtml?: string;
  newDiffHtml?: string;
  diffHtml?: string;
}

export interface RegulationDiff {
  oldVersion: string;
  newVersion: string;
  oldSourceUrl?: string;
  newSourceUrl?: string;
  comparedAt: string;
  sections: SectionDiff[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

interface DiffOperation {
  type: "equal" | "delete" | "insert";
  value: string;
}

const MAX_DP_CELLS = 2_000_000;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tokenize(text: string): string[] {
  return (
    text.match(
      /\p{Script=Han}|[\p{L}\p{N}]+(?:[’'._-][\p{L}\p{N}]+)*|[^\p{L}\p{N}\s]+|\s+/gu,
    ) ?? [text]
  );
}

function fallbackDiff(oldItems: string[], newItems: string[]): DiffOperation[] {
  const operations: DiffOperation[] = [];
  for (const value of oldItems) operations.push({ type: "delete", value });
  for (const value of newItems) operations.push({ type: "insert", value });
  return operations;
}

function diffSequence(oldItems: string[], newItems: string[]): DiffOperation[] {
  let prefix = 0;
  while (
    prefix < oldItems.length &&
    prefix < newItems.length &&
    oldItems[prefix] === newItems[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < oldItems.length - prefix &&
    suffix < newItems.length - prefix &&
    oldItems[oldItems.length - suffix - 1] ===
      newItems[newItems.length - suffix - 1]
  ) {
    suffix += 1;
  }

  if (prefix > 0 || suffix > 0) {
    return [
      ...oldItems
        .slice(0, prefix)
        .map((value) => ({ type: "equal" as const, value })),
      ...diffSequence(
        oldItems.slice(prefix, oldItems.length - suffix),
        newItems.slice(prefix, newItems.length - suffix),
      ),
      ...oldItems
        .slice(oldItems.length - suffix)
        .map((value) => ({ type: "equal" as const, value })),
    ];
  }

  const rows = oldItems.length + 1;
  const columns = newItems.length + 1;
  if (rows * columns > MAX_DP_CELLS) {
    return fallbackDiff(oldItems, newItems);
  }

  const table = Array.from({ length: rows }, () =>
    new Uint16Array(columns),
  );
  for (let oldIndex = 1; oldIndex < rows; oldIndex += 1) {
    for (let newIndex = 1; newIndex < columns; newIndex += 1) {
      table[oldIndex][newIndex] =
        oldItems[oldIndex - 1] === newItems[newIndex - 1]
          ? table[oldIndex - 1][newIndex - 1] + 1
          : Math.max(
              table[oldIndex - 1][newIndex],
              table[oldIndex][newIndex - 1],
            );
    }
  }

  const operations: DiffOperation[] = [];
  let oldIndex = oldItems.length;
  let newIndex = newItems.length;
  while (oldIndex > 0 || newIndex > 0) {
    if (
      oldIndex > 0 &&
      newIndex > 0 &&
      oldItems[oldIndex - 1] === newItems[newIndex - 1]
    ) {
      operations.unshift({
        type: "equal",
        value: oldItems[oldIndex - 1],
      });
      oldIndex -= 1;
      newIndex -= 1;
    } else if (
      newIndex > 0 &&
      (oldIndex === 0 ||
        table[oldIndex][newIndex - 1] >= table[oldIndex - 1][newIndex])
    ) {
      operations.unshift({
        type: "insert",
        value: newItems[newIndex - 1],
      });
      newIndex -= 1;
    } else {
      operations.unshift({
        type: "delete",
        value: oldItems[oldIndex - 1],
      });
      oldIndex -= 1;
    }
  }
  return operations;
}

function inlineDiff(
  oldText: string,
  newText: string,
): { oldHtml: string; newHtml: string } {
  if (oldText === newText) {
    const escaped = escapeHtml(oldText);
    return { oldHtml: escaped, newHtml: escaped };
  }

  const operations = diffSequence(tokenize(oldText), tokenize(newText));
  let oldHtml = "";
  let newHtml = "";

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    if (operation.type === "equal") {
      oldHtml += escapeHtml(operation.value);
      newHtml += escapeHtml(operation.value);
      continue;
    }

    let changed = operation.value;
    while (
      index + 1 < operations.length &&
      operations[index + 1].type === operation.type
    ) {
      index += 1;
      changed += operations[index].value;
    }

    if (operation.type === "delete") {
      oldHtml += `<del>${escapeHtml(changed)}</del>`;
    } else {
      newHtml += `<ins>${escapeHtml(changed)}</ins>`;
    }
  }

  return { oldHtml, newHtml };
}

function lines(text: string | undefined): string[] {
  return (text ?? "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function generateSideBySideDiff(
  oldText: string | undefined,
  newText: string | undefined,
): { oldHtml: string; newHtml: string } {
  const oldLines = lines(oldText);
  const newLines = lines(newText);
  if (oldLines.length === 0 && newLines.length === 0) {
    return { oldHtml: "", newHtml: "" };
  }
  if (oldLines.length === 0) {
    return {
      oldHtml: "",
      newHtml: newLines.map((line) => `<ins>${escapeHtml(line)}</ins>`).join("\n"),
    };
  }
  if (newLines.length === 0) {
    return {
      oldHtml: oldLines.map((line) => `<del>${escapeHtml(line)}</del>`).join("\n"),
      newHtml: "",
    };
  }

  const operations = diffSequence(oldLines, newLines);
  const oldParts: string[] = [];
  const newParts: string[] = [];
  let index = 0;

  while (index < operations.length) {
    const operation = operations[index];
    if (operation.type === "equal") {
      const escaped = escapeHtml(operation.value);
      oldParts.push(escaped);
      newParts.push(escaped);
      index += 1;
      continue;
    }

    const deleted: string[] = [];
    const inserted: string[] = [];
    while (index < operations.length && operations[index].type !== "equal") {
      if (operations[index].type === "delete") {
        deleted.push(operations[index].value);
      } else {
        inserted.push(operations[index].value);
      }
      index += 1;
    }

    const paired = Math.min(deleted.length, inserted.length);
    for (let pairIndex = 0; pairIndex < paired; pairIndex += 1) {
      const changed = inlineDiff(deleted[pairIndex], inserted[pairIndex]);
      oldParts.push(changed.oldHtml);
      newParts.push(changed.newHtml);
    }
    for (
      let deletedIndex = paired;
      deletedIndex < deleted.length;
      deletedIndex += 1
    ) {
      oldParts.push(`<del>${escapeHtml(deleted[deletedIndex])}</del>`);
      newParts.push("");
    }
    for (
      let insertedIndex = paired;
      insertedIndex < inserted.length;
      insertedIndex += 1
    ) {
      oldParts.push("");
      newParts.push(`<ins>${escapeHtml(inserted[insertedIndex])}</ins>`);
    }
  }

  return {
    oldHtml: oldParts.join("\n"),
    newHtml: newParts.join("\n"),
  };
}

export function generateInlineDiff(oldText: string, newText: string): string {
  const diff = inlineDiff(oldText, newText);
  return `${diff.oldHtml}${diff.newHtml}`;
}

export function compareRegulations(
  oldSnapshot: {
    version: string;
    sourceUrl?: string;
    sections: RegulationSection[];
  },
  newSnapshot: {
    version: string;
    sourceUrl?: string;
    sections: RegulationSection[];
  },
): RegulationDiff {
  const oldSections = new Map(
    oldSnapshot.sections.map((section) => [section.id, section]),
  );
  const newSections = new Map(
    newSnapshot.sections.map((section) => [section.id, section]),
  );
  const sections: SectionDiff[] = [];
  const summary = { added: 0, removed: 0, modified: 0, unchanged: 0 };

  for (const section of newSnapshot.sections) {
    const oldSection = oldSections.get(section.id);
    if (!oldSection) {
      const changed = generateSideBySideDiff(undefined, section.content);
      sections.push({
        sectionId: section.id,
        sectionTitle: section.title,
        changeType: "added",
        newContent: section.content,
        oldDiffHtml: changed.oldHtml,
        newDiffHtml: changed.newHtml,
      });
      summary.added += 1;
      continue;
    }

    if (oldSection.content !== section.content) {
      const changed = generateSideBySideDiff(
        oldSection.content,
        section.content,
      );
      sections.push({
        sectionId: section.id,
        sectionTitle: section.title,
        changeType: "modified",
        oldContent: oldSection.content,
        newContent: section.content,
        oldDiffHtml: changed.oldHtml,
        newDiffHtml: changed.newHtml,
        diffHtml: `${changed.oldHtml}${changed.newHtml}`,
      });
      summary.modified += 1;
      continue;
    }

    sections.push({
      sectionId: section.id,
      sectionTitle: section.title,
      changeType: "unchanged",
      newContent: section.content,
    });
    summary.unchanged += 1;
  }

  for (const section of oldSnapshot.sections) {
    if (newSections.has(section.id)) continue;
    const changed = generateSideBySideDiff(section.content, undefined);
    sections.push({
      sectionId: section.id,
      sectionTitle: section.title,
      changeType: "removed",
      oldContent: section.content,
      oldDiffHtml: changed.oldHtml,
      newDiffHtml: changed.newHtml,
    });
    summary.removed += 1;
  }

  return {
    oldVersion: oldSnapshot.version,
    newVersion: newSnapshot.version,
    oldSourceUrl: oldSnapshot.sourceUrl,
    newSourceUrl: newSnapshot.sourceUrl,
    comparedAt: new Date().toISOString(),
    sections,
    summary,
  };
}
