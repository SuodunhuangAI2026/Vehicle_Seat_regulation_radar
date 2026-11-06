import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import type { RegulationChange } from "../src/types";
import {
  analyzeChange,
  buildFallbackChange,
  DeepSeekValidationError,
  validateDeepSeekResponse,
} from "../scripts/monitor/deepseek";
import { createSnapshot } from "../scripts/monitor/adapters";
import {
  escapeHtml,
  renderReportHtml,
  updateReportReviewState,
} from "../scripts/monitor/report-html";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(resolve("tests/fixtures", name), "utf8"),
  );
}

const validChange: RegulationChange = {
  id: "chg-test",
  standardIds: [],
  standardNumbers: ["UN R17"],
  title: "UN R17 头枕要求更新",
  system: "ECE",
  issuer: "UNECE",
  changeType: "revision",
  severity: "unassessed",
  oldVersion: "Rev.7",
  newVersion: "Rev.8",
  detectedAt: "2026-11-05T00:00:00.000Z",
  summaryZh: "待人工核对。",
  impactedDesignAreas: ["头枕"],
  impactedTestMethods: ["待官方原文核验"],
  recommendedActions: ["核对原文"],
  evidence: [
    {
      label: "UNECE",
      url: "https://unece.org/transport/vehicle-regulations/1958-agreement/r17",
    },
  ],
  confidence: "medium",
  reviewStatus: "draft",
  model: "deepseek-chat",
  promptVersion: "seats-v1",
};

it("rejects a malformed model response", async () => {
  const malformed = await fixture("deepseek-malformed.json");
  expect(() => validateDeepSeekResponse(malformed)).toThrow();
});

it("accepts the strict fixture and rejects evidence from another domain", async () => {
  const valid = await fixture("deepseek-valid.json");
  expect(validateDeepSeekResponse(valid).titleZh).toContain("UN R17");
  const fetchImpl = vi.fn(async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(valid) } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  await expect(
    analyzeChange({
      sourceTitle: "UNECE",
      evidenceText: "Revision 8",
      officialUrl: "https://unece.org/un-regulations-addenda-1958-agreement",
      apiKey: "test-key",
      fetchImpl,
    }),
  ).resolves.toMatchObject({ isMaterialChange: true });

  const hostile = {
    ...(valid as object),
    evidence: [
      {
        label: "fake",
        url: "https://example.com/fake",
      },
    ],
  };
  const hostileFetch = vi.fn(async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(hostile) } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  await expect(
    analyzeChange({
      sourceTitle: "UNECE",
      evidenceText: "Revision 8",
      officialUrl: "https://unece.org/un-regulations-addenda-1958-agreement",
      apiKey: "test-key",
      fetchImpl: hostileFetch,
    }),
  ).rejects.toBeInstanceOf(DeepSeekValidationError);
});

it("does not call DeepSeek or create a report when no API key is configured", async () => {
  const fetchImpl = vi.fn();
  await expect(
    analyzeChange({
      sourceTitle: "UNECE",
      evidenceText: "Revision 8",
      officialUrl: "https://unece.org/",
      fetchImpl,
    }),
  ).resolves.toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it("escapes model and source text in standalone report HTML", () => {
  const html = renderReportHtml({
    ...validChange,
    summaryZh: '<script>alert("x")</script>',
  });
  expect(html).not.toContain('<script>alert("x")</script>');
  expect(html).toContain("&lt;script&gt;");
  expect(escapeHtml(`<a href="'">`)).toBe(
    "&lt;a href=&quot;&#39;&quot;&gt;",
  );
});

it("updates the report badge only after a review decision", () => {
  const html = renderReportHtml(validChange);
  const approved = updateReportReviewState(
    html,
    "approved",
    "2026-11-06T00:00:00.000Z",
  );
  expect(approved).toContain('data-review-status="approved"');
  expect(approved).toContain("已人工批准");
  expect(approved).toContain('data-review-date="2026-11-06T00:00:00.000Z"');
});

it("creates a deterministic unassessed fallback when validation fails", () => {
  const source = {
    id: "src-unece",
    name: "UNECE",
    url: "https://unece.org/un-regulations-addenda-1958-agreement",
    category: "UNECE",
    monitoringMode: "automated" as const,
    adapterId: "unece",
  };
  const snapshot = createSnapshot({
    source,
    fetchedAt: "2026-11-06T00:00:00.000Z",
    items: [],
    excerpt: "Revision changed",
  });
  const fallback = buildFallbackChange({
    source,
    snapshot,
    diff: {
      changed: true,
      added: [],
      removed: [],
      changedItems: [],
    },
    now: "2026-11-06T00:00:00.000Z",
    reason: "AI 返回无效 JSON。",
  });
  expect(fallback.severity).toBe("unassessed");
  expect(fallback.reviewStatus).toBe("draft");
  expect(fallback.summaryZh).toContain("影响未评估");
});
