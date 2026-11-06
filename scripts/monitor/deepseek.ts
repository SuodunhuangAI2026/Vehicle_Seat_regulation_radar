import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  ChangeType,
  RegulationChange,
  SourceRecord,
} from "../../src/types/index.js";
import type {
  SourceItem,
  SourceSnapshot,
} from "./adapters.js";
import type { SnapshotDiff } from "./diff.js";
import { summarizeDiff } from "./diff.js";

export const PROMPT_VERSION = "seats-v1";
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

const httpUrl = z
  .string()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Only HTTP(S) evidence URLs are allowed",
  });

const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const DeepSeekChangeSchema = z
  .object({
    isMaterialChange: z.boolean(),
    changeType: z.enum([
      "new",
      "revision",
      "amendment",
      "corrigendum",
      "supplement",
      "replacement",
      "repeal",
      "translation-only",
      "status-change",
      "draft",
      "unknown",
    ]),
    titleZh: z.string().min(1).max(240),
    summaryZh: z.string().min(1).max(4000),
    oldVersion: z.string().max(160).nullable(),
    newVersion: z.string().max(160).nullable(),
    publicationDate: nullableDate,
    commentStart: nullableDate,
    commentEnd: nullableDate,
    approvalDate: nullableDate,
    effectiveDate: nullableDate,
    transitionEnd: nullableDate,
    repealDate: nullableDate,
    impactedDesignAreas: z.array(z.string().min(1).max(160)).max(20),
    impactedTestMethods: z.array(z.string().min(1).max(220)).max(20),
    recommendedActions: z.array(z.string().min(1).max(300)).max(20),
    evidence: z
      .array(
        z
          .object({
            label: z.string().min(1).max(180),
            url: httpUrl,
            quote: z.string().max(1000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    confidence: z.enum(["high", "medium", "low"]),
    needsHumanReview: z.boolean(),
  })
  .strict();

export type DeepSeekChange = z.infer<typeof DeepSeekChangeSchema>;

export class DeepSeekValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DeepSeekValidationError";
  }
}

function decodeHttpUrl(value: string): string {
  const base = value.replace(/\/+$/, "");
  return /\/chat\/completions$/.test(base)
    ? base
    : `${base}/chat/completions`;
}

export function validateDeepSeekResponse(input: unknown): DeepSeekChange {
  return DeepSeekChangeSchema.parse(input);
}

function rootDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/^www\./, "").split(".");
  return labels.slice(-2).join(".");
}

function assertOfficialEvidence(
  result: DeepSeekChange,
  officialUrl: string,
): void {
  const officialRoot = rootDomain(new URL(officialUrl).hostname);
  for (const evidence of result.evidence) {
    if (rootDomain(new URL(evidence.url).hostname) !== officialRoot) {
      throw new DeepSeekValidationError(
        `Model evidence URL is outside the official source domain: ${evidence.url}`,
      );
    }
  }
}

const systemPrompt = `你是汽车座椅法规情报分析助手。你只分析用户提供的官方信源证据，不得猜测或补全证据中没有的法规条款、试验方法、生效日期、过渡期或法律结论。

输出必须是单个 JSON 对象，且严格符合以下字段：
{
  "isMaterialChange": boolean,
  "changeType": "new" | "revision" | "amendment" | "corrigendum" | "supplement" | "replacement" | "repeal" | "translation-only" | "status-change" | "draft" | "unknown",
  "titleZh": string,
  "summaryZh": string,
  "oldVersion": string | null,
  "newVersion": string | null,
  "publicationDate": "YYYY-MM-DD" | null,
  "commentStart": "YYYY-MM-DD" | null,
  "commentEnd": "YYYY-MM-DD" | null,
  "approvalDate": "YYYY-MM-DD" | null,
  "effectiveDate": "YYYY-MM-DD" | null,
  "transitionEnd": "YYYY-MM-DD" | null,
  "repealDate": "YYYY-MM-DD" | null,
  "impactedDesignAreas": string[],
  "impactedTestMethods": string[],
  "recommendedActions": string[],
  "evidence": [{"label": string, "url": string, "quote": string}],
  "confidence": "high" | "medium" | "low",
  "needsHumanReview": true
}

规则：
1. 只允许使用展示的官方信源 URL 作为 evidence.url。
2. 任何无法从证据确认的日期必须为 null，禁止推测。
3. 无法确认的条款、试验方法或影响必须明确写“待官方原文核验”，不要伪造。
4. M1 座椅关注点包括座椅总成、骨架、滑轨、固定点、ISOFIX、头枕、安全带约束与相关试验。
5. 所有结论都必须标记需要人工复核。
6. 只返回 JSON，不要 Markdown、代码围栏或解释。`;

export async function analyzeChange(input: {
  sourceTitle: string;
  evidenceText: string;
  officialUrl: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<DeepSeekChange | null> {
  if (!input.apiKey) {
    console.log("DEEPSEEK_SKIPPED: DEEPSEEK_API_KEY is not configured");
    return null;
  }

  const baseUrl = input.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL;
  const model = input.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
  const response = await (input.fetchImpl ?? fetch)(decodeHttpUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            `官方信源：${input.sourceTitle}`,
            `官方 URL：${input.officialUrl}`,
            "以下仅为官方信源抓取到的差异证据，请据此判断：",
            input.evidenceText.slice(0, 12_000),
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `DeepSeek request failed: HTTP ${response.status} ${response.statusText}`,
    );
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new DeepSeekValidationError("DeepSeek returned an empty response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
  } catch (error) {
    throw new DeepSeekValidationError("DeepSeek returned invalid JSON", {
      cause: error,
    });
  }
  let result: DeepSeekChange;
  try {
    result = validateDeepSeekResponse(parsed);
  } catch (error) {
    throw new DeepSeekValidationError("DeepSeek response failed schema validation", {
      cause: error,
    });
  }
  assertOfficialEvidence(result, input.officialUrl);
  return result;
}

function inferSystem(source: SourceRecord): string {
  switch (source.adapterId) {
    case "unece":
      return "ECE";
    case "ecfr":
    case "nhtsa":
      return "FMVSS";
    case "transport-canada":
      return "CMVSS";
    default:
      return "其他标准";
  }
}

function inferIssuer(source: SourceRecord): string {
  switch (source.adapterId) {
    case "unece":
      return "UNECE";
    case "ecfr":
    case "nhtsa":
      return "NHTSA";
    case "transport-canada":
      return "Transport Canada";
    default:
      return "官方信源";
  }
}

function standardNumbersFromItems(items: SourceItem[]): string[] {
  const numbers = new Set<string>();
  for (const item of items) {
    const fmvss = item.title.match(/Standard\s+No\.?\s*(\d{3})/i)?.[1];
    if (fmvss) numbers.add(`FMVSS ${fmvss}`);
    const un = item.title.match(/UN\s+Regulation\s+No\.?\s*(\d{2,3})/i)?.[1];
    if (un) numbers.add(`UN R${un}`);
    const rNumber = item.title.match(/\bR(\d{2,3})\b/i)?.[1];
    if (rNumber && sourceIsUnece(items)) numbers.add(`UN R${rNumber}`);
    const cmvss = item.title.match(/CMVSS\s+(\d{3})/i)?.[1];
    if (cmvss) numbers.add(`CMVSS ${cmvss}`);
    const section = item.key.match(/571\.(\d{3})/i)?.[1];
    if (section) numbers.add(`FMVSS ${section}`);
  }
  return [...numbers].slice(0, 20);
}

function sourceIsUnece(items: SourceItem[]): boolean {
  return items.some((item) => item.key.startsWith("unece:"));
}

function changedItems(diff: SnapshotDiff): SourceItem[] {
  return [
    ...diff.added,
    ...diff.removed,
    ...diff.changedItems,
  ].slice(0, 40);
}

function changeId(
  source: SourceRecord,
  snapshot: SourceSnapshot,
  diff: SnapshotDiff,
): string {
  const signature = [
    source.id,
    snapshot.hash,
    ...changedItems(diff).map((item) => `${item.key}:${item.version ?? ""}`),
  ].join("|");
  return `chg-${createHash("sha256").update(signature).digest("hex").slice(0, 14)}`;
}

function evidenceTextForDiff(
  snapshot: SourceSnapshot,
  diff: SnapshotDiff,
): string {
  return [
    `信源：${snapshot.title}`,
    `信源 URL：${snapshot.sourceUrl}`,
    summarizeDiff(diff),
    `抓取摘要：${snapshot.excerpt}`,
  ].join("\n");
}

function dateOrUndefined(value: string | null): string | undefined {
  return value ?? undefined;
}

export function buildFallbackChange(input: {
  source: SourceRecord;
  snapshot: SourceSnapshot;
  diff: SnapshotDiff;
  now: string;
  reason: string;
}): RegulationChange {
  const items = changedItems(input.diff);
  const preview = items
    .slice(0, 6)
    .map((item) => `${item.title}${item.version ? ` (${item.version})` : ""}`)
    .join("；");
  return {
    id: changeId(input.source, input.snapshot, input.diff),
    standardIds: [],
    standardNumbers: standardNumbersFromItems(items),
    title: `${input.source.name}：检测到来源内容变化`,
    system: inferSystem(input.source),
    issuer: inferIssuer(input.source),
    changeType: "unknown",
    severity: "unassessed",
    detectedAt: input.now,
    summaryZh: `${input.reason} 已保留差异证据，影响未评估。${preview ? `可见条目：${preview}。` : ""} 须打开官方来源人工核对后方可形成法规结论。`,
    impactedDesignAreas: [],
    impactedTestMethods: [],
    recommendedActions: [
      "打开官方来源核对新增、移除或版本变化条目",
      "人工判断对 M1 座椅设计、试验和认证的影响",
    ],
    evidence: [
      {
        label: `${input.source.name} 官方来源`,
        url: input.source.url,
        quote: input.snapshot.excerpt.slice(0, 700),
      },
    ],
    confidence: "low",
    reviewStatus: "draft",
    model: process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL,
    promptVersion: PROMPT_VERSION,
  };
}

export function buildRegulationChange(input: {
  source: SourceRecord;
  snapshot: SourceSnapshot;
  diff: SnapshotDiff;
  now: string;
  result: DeepSeekChange;
}): RegulationChange {
  const items = changedItems(input.diff);
  return {
    id: changeId(input.source, input.snapshot, input.diff),
    standardIds: [],
    standardNumbers: standardNumbersFromItems(items),
    title: input.result.titleZh,
    system: inferSystem(input.source),
    issuer: inferIssuer(input.source),
    changeType: input.result.changeType as ChangeType,
    severity: "unassessed",
    oldVersion: input.result.oldVersion ?? undefined,
    newVersion: input.result.newVersion ?? undefined,
    detectedAt: input.now,
    publicationDate: dateOrUndefined(input.result.publicationDate),
    commentStart: dateOrUndefined(input.result.commentStart),
    commentEnd: dateOrUndefined(input.result.commentEnd),
    approvalDate: dateOrUndefined(input.result.approvalDate),
    effectiveDate: dateOrUndefined(input.result.effectiveDate),
    transitionEnd: dateOrUndefined(input.result.transitionEnd),
    repealDate: dateOrUndefined(input.result.repealDate),
    summaryZh: input.result.summaryZh,
    impactedDesignAreas: input.result.impactedDesignAreas,
    impactedTestMethods: input.result.impactedTestMethods,
    recommendedActions: input.result.recommendedActions,
    evidence: input.result.evidence,
    confidence: input.result.confidence,
    reviewStatus: "draft",
    model: process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL,
    promptVersion: PROMPT_VERSION,
  };
}

export function createDeepSeekAnalyzer(options?: {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const apiKey = options?.apiKey ?? process.env.DEEPSEEK_API_KEY;
  return async (
    source: SourceRecord,
    snapshot: SourceSnapshot,
    diff: SnapshotDiff,
    now: string,
    previous?: RegulationChange,
  ): Promise<RegulationChange | null> => {
    if (!apiKey) {
      console.log("DEEPSEEK_SKIPPED: no report will be generated");
      return null;
    }
    if (previous) return null;
    try {
      const result = await analyzeChange({
        sourceTitle: source.name,
        evidenceText: evidenceTextForDiff(snapshot, diff),
        officialUrl: source.url,
        apiKey,
        fetchImpl: options?.fetchImpl,
      });
      if (!result || !result.isMaterialChange) return null;
      return buildRegulationChange({ source, snapshot, diff, now, result });
    } catch (error) {
      console.error("DEEPSEEK_ANALYSIS_FAILED", error);
      return buildFallbackChange({
        source,
        snapshot,
        diff,
        now,
        reason: `AI 分析未通过校验：${error instanceof Error ? error.message : String(error)}。`,
      });
    }
  };
}
