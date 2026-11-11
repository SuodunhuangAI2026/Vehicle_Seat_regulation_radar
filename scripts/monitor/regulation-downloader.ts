import { load } from "cheerio";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface RegulationSnapshot {
  version: string;
  downloadedAt: string;
  sourceUrl: string;
  documentTitle: string;
  sections: RegulationSection[];
  fullText: string;
}

export interface RegulationSection {
  id: string;
  title: string;
  content: string;
  level: number;
}

const SNAPSHOTS_DIR = "monitor/state/regulation-snapshots";
const LATEST_SNAPSHOT = "latest.json";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSectionTitle(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function versionFromHtml(
  $: ReturnType<typeof load>,
  sourceUrl: string,
  downloadedAt: string,
): string {
  const metadataDate =
    $('meta[name="dcterms.issued"]').attr("content")?.trim() ||
    $('meta[name="dcterms.modified"]').attr("content")?.trim();
  if (metadataDate && /^\d{4}-\d{2}-\d{2}$/.test(metadataDate)) {
    return metadataDate;
  }

  const pathDate = sourceUrl.match(/\/(\d{4})(\d{2})(\d{2})\//);
  if (pathDate) return `${pathDate[1]}-${pathDate[2]}-${pathDate[3]}`;

  const currentTo = normalizeText($("main").first().text()).match(
    /current to\s+(\d{4}-\d{2}-\d{2})/i,
  );
  return currentTo?.[1] ?? downloadedAt.slice(0, 10);
}

function sectionKey(
  headingId: string | undefined,
  title: string,
  level: number,
  occurrences: Map<string, number>,
): string {
  if (headingId) return headingId;
  const base = `title:${level}:${normalizeSectionTitle(title)}`;
  const next = (occurrences.get(base) ?? 0) + 1;
  occurrences.set(base, next);
  return `${base}:${next}`;
}

export function parseRegulationHtml(input: {
  html: string;
  sourceUrl: string;
  downloadedAt: string;
}): RegulationSnapshot {
  const $ = load(input.html);
  const sections: RegulationSection[] = [];
  const occurrences = new Map<string, number>();
  let currentSection: RegulationSection | undefined;
  let currentContent: string[] = [];

  const finalizeSection = () => {
    if (!currentSection) return;
    currentSection.content = currentContent.join("\n").trim();
    sections.push(currentSection);
    currentSection = undefined;
    currentContent = [];
  };

  const mainContent = $("main").length > 0 ? $("main") : $("body");
  mainContent.find("h2, h3, h4, p, table, li").each((_, element) => {
    const $element = $(element);
    const tagName = element.tagName.toLowerCase();
    if (["h2", "h3", "h4"].includes(tagName)) {
      finalizeSection();
      const title = normalizeText($element.text());
      const level = Number.parseInt(tagName[1], 10);
      currentSection = {
        id: sectionKey(
          $element.attr("id"),
          title,
          level,
          occurrences,
        ),
        title,
        content: "",
        level,
      };
      return;
    }

    if (!currentSection) return;
    if (tagName === "li" && $element.find("p, table, li").length > 0) {
      return;
    }
    if (tagName === "table" && $element.find("table").length > 0) {
      return;
    }
    const text = normalizeText($element.text());
    if (text) currentContent.push(text);
  });
  finalizeSection();

  const documentTitle =
    normalizeText($("h1").first().text()) ||
    normalizeText($("title").first().text()) ||
    input.sourceUrl;

  return {
    version: versionFromHtml($, input.sourceUrl, input.downloadedAt),
    downloadedAt: input.downloadedAt,
    sourceUrl: input.sourceUrl,
    documentTitle,
    sections,
    fullText: sections
      .map((section) => `${section.title}\n${section.content}`)
      .join("\n\n"),
  };
}

export async function downloadRegulationText(
  sourceUrl: string,
  _regulationId: string,
): Promise<RegulationSnapshot | null> {
  try {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "SeatScope-M1-Regulation-Radar/0.2 (+https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      console.error(`Failed to fetch ${sourceUrl}: ${response.status}`);
      return null;
    }

    return parseRegulationHtml({
      html: await response.text(),
      sourceUrl: response.url || sourceUrl,
      downloadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error downloading regulation from ${sourceUrl}:`, error);
    return null;
  }
}

export async function saveSnapshot(
  regulationId: string,
  snapshot: RegulationSnapshot,
): Promise<string> {
  const filepath = join(SNAPSHOTS_DIR, regulationId, LATEST_SNAPSHOT);
  await mkdir(dirname(filepath), { recursive: true });
  const tempPath = `${filepath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(tempPath, filepath);
  return filepath;
}

export async function loadLatestSnapshot(
  regulationId: string,
): Promise<RegulationSnapshot | null> {
  try {
    return JSON.parse(
      await readFile(
        join(SNAPSHOTS_DIR, regulationId, LATEST_SNAPSHOT),
        "utf8",
      ),
    ) as RegulationSnapshot;
  } catch {
    return null;
  }
}

export async function hasPreviousSnapshot(
  regulationId: string,
): Promise<boolean> {
  return (await loadLatestSnapshot(regulationId)) !== null;
}
