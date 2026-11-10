import { load } from "cheerio";
import { extractText } from "unpdf";
import type {
  ComparisonDocument,
  RegulationComparison,
} from "../../src/types/index.js";
import type { SourceItem, SourceSnapshot } from "./adapters.js";
import type { SnapshotDiff } from "./diff.js";

const MAX_DOCUMENT_BYTES = 20_000_000;
const MAX_MODEL_TEXT_CHARS = 24_000;

export interface ExtractedDocument extends ComparisonDocument {
  text: string;
}

export interface ComparisonTargetResult {
  title: string;
  oldDocument?: ExtractedDocument;
  newDocument?: ExtractedDocument;
  limitations: string[];
}

export interface ComparisonBundle {
  comparison: RegulationComparison;
  oldText: string;
  newText: string;
}

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractHtmlText(html: string): string {
  const $ = load(html);
  $("script, style, noscript, svg, nav, footer, header, form").remove();
  const candidates = [
    "main article",
    "main",
    "article",
    "[role='main']",
    ".content",
    "#content",
    "body",
  ];
  let best = "";
  for (const selector of candidates) {
    const text = cleanText($(selector).first().text());
    if (text.length > best.length) best = text;
  }
  return best;
}

function titleFromHtml(html: string): string | undefined {
  const $ = load(html);
  return (
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim() ||
    undefined
  );
}

export async function fetchDocumentText(
  url: string,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    maxBytes?: number;
  } = {},
): Promise<ExtractedDocument> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30_000,
  );
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "SeatScope-M1-Regulation-Radar/0.2 (+https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar)",
        Accept: "application/pdf,text/html,application/xhtml+xml,text/plain",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > (options.maxBytes ?? MAX_DOCUMENT_BYTES)) {
    throw new Error(`文档超过 ${options.maxBytes ?? MAX_DOCUMENT_BYTES} 字节限制`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > (options.maxBytes ?? MAX_DOCUMENT_BYTES)) {
    throw new Error(`文档超过 ${options.maxBytes ?? MAX_DOCUMENT_BYTES} 字节限制`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const pathname = new URL(response.url || url).pathname.toLowerCase();
  const isPdf =
    contentType.includes("application/pdf") ||
    pathname.endsWith(".pdf") ||
    Buffer.from(buffer.subarray(0, 5)).toString("latin1") === "%PDF-";

  if (isPdf) {
    const result = await extractText(buffer, { mergePages: true });
    const text = cleanText(result.text);
    if (text.length < 80) {
      throw new Error("PDF 未提取到可用正文，可能是扫描件或受保护文档");
    }
    return {
      title: new URL(response.url || url).pathname.split("/").pop() || url,
      url: response.url || url,
      documentKind: "pdf",
      textLength: text.length,
      text: text.slice(0, 160_000),
    };
  }

  const decoded = cleanText(new TextDecoder().decode(buffer));
  const isHtml =
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml+xml") ||
    /<html[\s>]|<!doctype html/i.test(decoded.slice(0, 2_000));
  const text = isHtml ? extractHtmlText(decoded) : decoded;
  if (text.length < 80) {
    throw new Error("页面未提取到可用正文");
  }
  return {
    title:
      (isHtml ? titleFromHtml(decoded) : undefined) ||
      new URL(response.url || url).pathname.split("/").pop() ||
      url,
    url: response.url || url,
    documentKind: isHtml ? "html" : "text",
    textLength: text.length,
    text: text.slice(0, 160_000),
  };
}

function identity(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(
      /\b(?:revision|rev\.?|amendment|amd\.?|supplement)\s*\d+(?:\s*[/-]\s*\d+)?/gi,
      "",
    )
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function selectComparisonTargets(
  previous: SourceSnapshot | undefined,
  next: SourceSnapshot,
  diff: SnapshotDiff,
): Array<{ title: string; oldItem?: SourceItem; newItem?: SourceItem }> {
  const targets: Array<{
    title: string;
    oldItem?: SourceItem;
    newItem?: SourceItem;
  }> = [];
  for (const pair of diff.changedPairs ?? []) {
    targets.push({
      title: pair.next.title,
      oldItem: pair.previous,
      newItem: pair.next,
    });
  }

  const removedByTitle = new Map(
    diff.removed.map((item) => [identity(item.title), item]),
  );
  const usedRemoved = new Set<string>();
  for (const item of diff.added) {
    const key = identity(item.title);
    const oldItem = removedByTitle.get(key);
    if (oldItem) usedRemoved.add(oldItem.key);
    targets.push({ title: item.title, oldItem, newItem: item });
  }
  for (const item of diff.removed) {
    if (!usedRemoved.has(item.key)) {
      targets.push({ title: item.title, oldItem: item });
    }
  }

  if (targets.length === 0 && previous) {
    for (const item of [...diff.added, ...diff.changedItems].slice(0, 3)) {
      const oldItem = previous.items.find(
        (candidate) => candidate.key === item.key,
      );
      targets.push({ title: item.title, oldItem, newItem: item });
    }
  }
  return targets.slice(0, 3);
}

function combineDocuments(
  documents: Array<{ label: string; document: ExtractedDocument }>,
): string {
  return documents
    .map(
      ({ label, document }) =>
        `【${label}｜${document.title}｜${document.url}】\n${document.text}`,
    )
    .join("\n\n")
    .slice(0, MAX_MODEL_TEXT_CHARS);
}

export async function buildComparisonBundle(input: {
  previous?: SourceSnapshot;
  next: SourceSnapshot;
  diff: SnapshotDiff;
  fetchImpl?: typeof fetch;
}): Promise<ComparisonBundle> {
  const targets = selectComparisonTargets(
    input.previous,
    input.next,
    input.diff,
  );
  const cache = new Map<string, Promise<ExtractedDocument>>();
  const getDocument = (url: string) => {
    const cached = cache.get(url);
    if (cached) return cached;
    const pending = fetchDocumentText(url, {
      fetchImpl: input.fetchImpl,
    });
    cache.set(url, pending);
    return pending;
  };

  const results: ComparisonTargetResult[] = [];
  for (const target of targets) {
    const limitations: string[] = [];
    const [oldResult, newResult] = await Promise.allSettled([
      target.oldItem ? getDocument(target.oldItem.url) : Promise.reject(),
      target.newItem ? getDocument(target.newItem.url) : Promise.reject(),
    ]);
    const oldDocument =
      oldResult.status === "fulfilled" ? oldResult.value : undefined;
    const newDocument =
      newResult.status === "fulfilled" ? newResult.value : undefined;
    if (target.oldItem && !oldDocument) {
      limitations.push(
        `旧版原文不可用：${target.oldItem.title}（${target.oldItem.url}）`,
      );
    }
    if (target.newItem && !newDocument) {
      limitations.push(
        `新版原文不可用：${target.newItem.title}（${target.newItem.url}）`,
      );
    }
    results.push({
      title: target.title,
      oldDocument,
      newDocument,
      limitations,
    });
  }

  const oldDocuments = results.flatMap((result) =>
    result.oldDocument
      ? [{ label: result.title, document: result.oldDocument }]
      : [],
  );
  const newDocuments = results.flatMap((result) =>
    result.newDocument
      ? [{ label: result.title, document: result.newDocument }]
      : [],
  );
  const limitations = results.flatMap((result) => result.limitations);
  const status =
    oldDocuments.length > 0 && newDocuments.length > 0
      ? "complete"
      : oldDocuments.length > 0 || newDocuments.length > 0
        ? "partial"
        : "failed";

  return {
    comparison: {
      status,
      oldDocument: oldDocuments[0]?.document,
      newDocument: newDocuments[0]?.document,
      sections: [],
      limitations:
        limitations.length > 0
          ? limitations
          : status === "failed"
            ? ["未找到可下载并解析的新旧公开原文。"]
            : [],
    },
    oldText: combineDocuments(oldDocuments),
    newText: combineDocuments(newDocuments),
  };
}

export function comparisonToMarkdown(bundle: ComparisonBundle): string {
  return [
    `原文提取状态：${bundle.comparison.status}`,
    bundle.oldText ? `旧版原文：\n${bundle.oldText}` : "旧版原文：未取得",
    bundle.newText ? `新版原文：\n${bundle.newText}` : "新版原文：未取得",
    ...bundle.comparison.limitations.map((item) => `限制：${item}`),
  ].join("\n\n");
}
