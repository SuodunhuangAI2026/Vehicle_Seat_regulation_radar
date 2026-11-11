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
import type { RegulationDiff } from "../scripts/monitor/text-diff";

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
      oldText: "旧版原文：头枕高度应保持在合适位置。",
      newText: "新版原文：头枕高度和前后位置应保持在合适位置。",
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
      oldText: "旧版原文：头枕高度应保持在合适位置。",
      newText: "新版原文：头枕高度和前后位置应保持在合适位置。",
      officialUrl: "https://unece.org/un-regulations-addenda-1958-agreement",
      apiKey: "test-key",
      fetchImpl: hostileFetch,
    }),
  ).rejects.toBeInstanceOf(DeepSeekValidationError);
});

it("rejects comparison text that is not an exact source excerpt", async () => {
  const valid = await fixture("deepseek-valid.json");
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
      oldText: "旧版原文没有这句话。",
      newText: "新版原文也没有这句话。",
      officialUrl: "https://unece.org/un-regulations-addenda-1958-agreement",
      apiKey: "test-key",
      fetchImpl,
    }),
  ).rejects.toThrow("not an exact excerpt");
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
  expect(html).toContain('rel="icon"');
  expect(escapeHtml(`<a href="'">`)).toBe(
    "&lt;a href=&quot;&#39;&quot;&gt;",
  );
});

it("renders aligned old/new source text with inline change highlights", () => {
  const html = renderReportHtml({
    ...validChange,
    comparison: {
      status: "complete",
      oldDocument: {
        title: "R017r7e.pdf",
        url: "https://unece.org/r17-old.pdf",
        documentKind: "pdf",
        textLength: 1200,
      },
      newDocument: {
        title: "R017r8e.pdf",
        url: "https://unece.org/r17-new.pdf",
        documentKind: "pdf",
        textLength: 1300,
      },
      sections: [
        {
          section: "头枕位置要求",
          clause: "7.2",
          changeType: "modified",
          oldText: "头枕高度应保持在较高位置。",
          newText: "头枕高度和前后位置应保持在合适位置。",
          impactZh: "复核头枕调节范围与测量方法。",
          confidence: "medium",
        },
      ],
      limitations: [],
    },
  });

  expect(html).toContain("新旧原文左右对比");
  expect(html).toContain("<del>");
  expect(html).toContain("<ins>");
  expect(html).toContain("https://unece.org/r17-old.pdf");
});

it("renders a regenerated report with generated time and side-by-side regulation text", () => {
  const regulationDiff: RegulationDiff = {
    oldVersion: "2024-12-18",
    newVersion: "2025-01-01",
    comparedAt: "2026-11-11T06:30:00.000Z",
    sections: [
      {
        sectionId: "h-478981",
        sectionTitle: "Notice of Defect",
        changeType: "modified",
        oldContent: "A company shall provide a notice in writing.",
        newContent: "A company shall provide a notice in writing and publish it.",
        diffHtml: "<del>in writing</del><ins>in writing and publish it</ins>",
      },
    ],
    summary: {
      added: 0,
      removed: 0,
      modified: 1,
      unchanged: 0,
    },
  };

  const html = renderReportHtml(
    validChange,
    regulationDiff,
    "2026-11-11T06:30:00.000Z",
  );

  expect(html).toContain("审核稿生成时间");
  expect(html).toContain("2026/11/11");
  expect(html).toContain("监测发现时间");
  expect(html).toContain('class="diff-pane old"');
  expect(html).toContain('class="diff-pane new"');
  expect(html).not.toContain("该草稿尚未附带可解析的新旧原文");
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
