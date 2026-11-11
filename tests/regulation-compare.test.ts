import { expect, it, vi } from "vitest";
import { compareAndStoreRegulation } from "../scripts/monitor/regulation-compare";
import {
  parseRegulationHtml,
  type RegulationSnapshot,
} from "../scripts/monitor/regulation-downloader";
import { generateSideBySideDiff } from "../scripts/monitor/text-diff";

function snapshot(
  version: string,
  sourceUrl: string,
  content: string,
): RegulationSnapshot {
  return {
    version,
    downloadedAt: "2026-11-11T00:00:00.000Z",
    sourceUrl,
    documentTitle: "Motor Vehicle Safety Regulations",
    sections: [
      {
        id: "h-478981",
        title: "Notice of Defect",
        content,
        level: 2,
      },
    ],
    fullText: content,
  };
}

it("keeps side-by-side word changes in source order", () => {
  const diff = generateSideBySideDiff(
    "alpha beta gamma",
    "alpha delta gamma",
  );

  expect(diff.oldHtml).toBe("alpha <del>beta</del> gamma");
  expect(diff.newHtml).toBe("alpha <ins>delta</ins> gamma");
});

it("parses leaf regulation blocks without duplicating nested list text", () => {
  const parsed = parseRegulationHtml({
    html: `<!doctype html>
      <html>
        <head><meta name="dcterms.issued" content="2025-01-01"></head>
        <body>
          <main>
            <h2 id="h-1">Notice of Defect</h2>
            <ul>
              <li><p>First paragraph.</p></li>
              <li>
                <p>Second paragraph.</p>
                <ul><li>Historical note.</li></ul>
              </li>
            </ul>
          </main>
        </body>
      </html>`,
    sourceUrl: "https://example.gov/current",
    downloadedAt: "2026-11-11T00:00:00.000Z",
  });

  expect(parsed.version).toBe("2025-01-01");
  expect(parsed.sections).toHaveLength(1);
  expect(parsed.sections[0].content.split("\n")).toEqual([
    "First paragraph.",
    "Second paragraph.",
    "Historical note.",
  ]);
});

it("loads the previous snapshot before downloading and saving the new one", async () => {
  const events: string[] = [];
  const previous = snapshot(
    "2024-12-18",
    "https://example.gov/old",
    "Old clause.",
  );
  const current = snapshot(
    "2025-01-01",
    "https://example.gov/current",
    "New clause.",
  );

  const result = await compareAndStoreRegulation(
    {
      regulationId: "canada-crc-1038",
      newSourceUrl: current.sourceUrl,
    },
    {
      loadLatest: vi.fn(async () => {
        events.push("load");
        return previous;
      }),
      download: vi.fn(async () => {
        events.push("download");
        return current;
      }),
      save: vi.fn(async () => {
        events.push("save");
        return "monitor/state/regulation-snapshots/canada/latest.json";
      }),
    },
  );

  expect(events).toEqual(["load", "download", "save"]);
  expect(result.diff?.summary.modified).toBe(1);
});
