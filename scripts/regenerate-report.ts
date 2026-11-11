import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RegulationChange } from "../src/types/index.js";
import { renderReportHtml } from "./monitor/report-html.js";

async function main() {
  const reportId = process.argv[2];
  if (!reportId) {
    throw new Error("Usage: npm run regenerate-report -- <report-id>");
  }

  const changesPath = resolve("src/data/changes.json");
  const changes = JSON.parse(await readFile(changesPath, "utf8")) as RegulationChange[];
  const change = changes.find((item) => item.id === reportId);
  if (!change) {
    throw new Error(`Unknown report: ${reportId}`);
  }

  const html = renderReportHtml(change);
  const outputPath = resolve("public", change.reportPath || `reports/${change.id}.html`);
  await writeFile(outputPath, html, "utf8");
  console.log(`Regenerated: ${outputPath}`);
}

main().catch((error) => {
  console.error("REGENERATE_FAILED", error);
  process.exitCode = 1;
});
