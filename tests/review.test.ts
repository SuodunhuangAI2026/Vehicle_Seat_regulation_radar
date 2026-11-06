import { expect, it } from "vitest";
import { reviewReport } from "../src/lib/review";
import { buildFeishuSummary } from "../src/lib/report-copy";
import {
  sampleChanges,
  sampleReport,
} from "./fixtures/empty-data";

it("preserves the report and changes only review state when approved", () => {
  const after = reviewReport(
    [sampleReport],
    sampleReport.id,
    "approved",
    "2026-11-05T12:00:00Z",
  );
  expect(after[0].reviewStatus).toBe("approved");
  expect(after[0].title).toBe(sampleReport.title);
  expect(after[0].reviewedAt).toBe("2026-11-05T12:00:00Z");
});

it("builds a Feishu copy with reviewer, standards, actions, and evidence", () => {
  const summary = buildFeishuSummary(sampleReport, sampleChanges);
  expect(summary).toContain("审核人：锁老师");
  expect(summary).toContain("UN R17");
  expect(summary).toContain("核对官方原文");
  expect(summary).toContain("https://unece.org");
  expect(summary).not.toContain("Webhook");
});
