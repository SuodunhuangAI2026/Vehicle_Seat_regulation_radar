import { expect, it, vi } from "vitest";
import { createSnapshot } from "../scripts/monitor/adapters";
import { diffSnapshot } from "../scripts/monitor/diff";
import {
  fetchDocumentText,
  selectComparisonTargets,
} from "../scripts/monitor/documents";

it("extracts readable official HTML text without navigation and scripts", async () => {
  const html = `<!doctype html>
    <html>
      <head><title>UN R17 official text</title></head>
      <body>
        <nav>Navigation menu</nav>
        <main>
          <h1>UN R17</h1>
          <p>${"头枕和座椅固定点的官方要求。".repeat(12)}</p>
        </main>
        <script>alert("ignored")</script>
      </body>
    </html>`;
  const fetchImpl = vi.fn(async () =>
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
  );

  const document = await fetchDocumentText("https://unece.org/r17", {
    fetchImpl,
  });
  expect(document.documentKind).toBe("html");
  expect(document.text).toContain("头枕和座椅固定点");
  expect(document.text).not.toContain("Navigation menu");
  expect(document.text).not.toContain("alert");
});

it("pairs added and removed versions by document identity", () => {
  const source = {
    id: "src-test",
    name: "UNECE",
    url: "https://unece.org",
    category: "UNECE",
    monitoringMode: "automated" as const,
    adapterId: "unece",
  };
  const previous = createSnapshot({
    source,
    fetchedAt: "2026-11-05T00:00:00.000Z",
    items: [
      {
        key: "old-url",
        title: "UN Regulation No. 17 Revision 7",
        url: "https://unece.org/r17-rev7.pdf",
      },
    ],
    excerpt: "old",
  });
  const next = createSnapshot({
    source,
    fetchedAt: "2026-11-06T00:00:00.000Z",
    items: [
      {
        key: "new-url",
        title: "UN Regulation No. 17 Revision 8",
        url: "https://unece.org/r17-rev8.pdf",
      },
    ],
    excerpt: "new",
  });
  const targets = selectComparisonTargets(
    previous,
    next,
    diffSnapshot(previous, next),
  );
  expect(targets).toHaveLength(1);
  expect(targets[0].oldItem?.url).toContain("rev7");
  expect(targets[0].newItem?.url).toContain("rev8");
});
