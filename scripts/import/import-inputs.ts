import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import ExcelJS from "exceljs";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import {
  normalizeStandardRows,
  type RawStandardDocument,
  type RawStandardSummary,
} from "./normalize-standards.js";
import {
  normalizeSourceLinks,
  type RawSourceLink,
} from "./normalize-sources.js";
import type { ImportReport } from "../../src/types/index.js";

type RowRecord = Record<string, string>;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("result" in value && value.result != null) {
      return cellText(value.result as ExcelJS.CellValue);
    }
    if ("hyperlink" in value && value.hyperlink) return value.hyperlink.trim();
  }
  return String(value).trim();
}

function sheetRows(sheet: ExcelJS.Worksheet): RowRecord[] {
  const headers = (sheet.getRow(1).values as ExcelJS.CellValue[])
    .slice(1)
    .map((value) => cellText(value));
  const rows: RowRecord[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: RowRecord = {};
    headers.forEach((header, index) => {
      if (header) record[header] = cellText(row.getCell(index + 1).value);
    });
    if (Object.values(record).some(Boolean)) rows.push(record);
  });

  return rows;
}

async function readWorkbook(path: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const documents = workbook.getWorksheet("标准清单");
  const summaries = workbook.getWorksheet("按标准号汇总");
  const stats = workbook.getWorksheet("统计与口径");
  if (!documents || !summaries || !stats) {
    throw new Error("Required workbook sheets are missing");
  }
  return {
    documents: sheetRows(documents),
    summaries: sheetRows(summaries),
    stats: sheetRows(stats),
  };
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function sectionCategory(heading: string): string {
  if (heading.includes("UNECE")) return "UNECE / WP.29 全球统一法规";
  if (heading.includes("欧盟")) return "欧盟法规与协调标准";
  if (heading.includes("中国国家标准")) return "中国国家标准与强制性法规";
  if (heading.includes("美国联邦")) return "美国联邦机动车安全法规";
  if (heading.includes("加拿大")) return "加拿大机动车安全法规";
  if (heading.includes("澳大利亚")) return "澳大利亚设计规则";
  if (heading.includes("亚太")) return "亚太其他国家与地区";
  if (heading.includes("全球法规指南")) return "全球法规指南与其他市场";
  if (heading.includes("NCAP")) return "全球新车评价规程与保险安全指数";
  if (heading.includes("国际与行业标准")) return "国际与行业标准文本";
  if (heading.includes("标准组织")) return "标准组织、标准检索与检测认证机构";
  return "其他标准来源";
}

function externalRelationships(xml: string): Map<string, string> {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml) as {
    Relationships?: {
      Relationship?: Array<Record<string, string>> | Record<string, string>;
    };
  };
  const raw = parsed.Relationships?.Relationship;
  const relationships = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const result = new Map<string, string>();
  for (const relationship of relationships) {
    const id = relationship["@_Id"];
    const target = relationship["@_Target"];
    const mode = relationship["@_TargetMode"];
    if (id && target && mode === "External") result.set(id, target);
  }
  return result;
}

function isNavigationText(text: string): boolean {
  return (
    !text ||
    /^[#\d]+$/.test(text) ||
    /^共\s*\d+\s*条$/.test(text) ||
    /^https?:\/\//i.test(text) ||
    ["名称", "网址", "原收藏夹位置"].includes(text) ||
    ["收藏夹栏", "标准网站", "工作", "技术", "其他", "其他收藏夹", "舒适性分析"].includes(
      text,
    )
  );
}

async function readSourceDocument(path: string) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const documentXml = await zip.file("word/document.xml")!.async("string");
  const relationshipXml = await zip
    .file("word/_rels/document.xml.rels")!
    .async("string");
  const relationships = externalRelationships(relationshipXml);
  const paragraphs = [...documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(
    (match) => match[0],
  );

  let category = "其他标准来源";
  let lastName = "";
  let bookmarkLocation = "";
  let sectionReportedItems = 0;
  const links: RawSourceLink[] = [];

  for (const paragraph of paragraphs) {
    const text = decodeXml(
      [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((match) => match[1])
        .join(""),
    ).trim();

    if (/^[一二三四五六七八九十]+、/.test(text)) {
      category = sectionCategory(text);
      lastName = "";
      continue;
    }

    const countMatch = text.match(/^共\s*(\d+)\s*条$/);
    if (countMatch) {
      sectionReportedItems += Number(countMatch[1]);
      continue;
    }

    if (
      ["收藏夹栏", "标准网站", "工作", "技术", "其他", "其他收藏夹", "舒适性分析"].includes(
        text,
      )
    ) {
      bookmarkLocation = text;
    }

    const ids = [...paragraph.matchAll(/<w:hyperlink[^>]*r:id="([^"]+)"/g)].map(
      (match) => match[1],
    );

    for (const id of ids) {
      const url = relationships.get(id);
      if (!url) continue;
      const displayName =
        text.replace(/https?:\/\/\S+/g, "").trim() ||
        lastName ||
        new URL(url).hostname;
      links.push({
        name: displayName,
        url,
        category,
        bookmarkLocation: bookmarkLocation || undefined,
      });
    }

    if (!isNavigationText(text) && !/^[一二三四五六七八九十]+、/.test(text)) {
      lastName = text;
    }
  }

  return { links, sectionReportedItems };
}

function numberFromStats(rows: RowRecord[], label: string): number {
  const row = rows.find((candidate) => candidate["项目"]?.includes(label));
  const value = row?.["数值 / 说明"]?.match(/\d+/)?.[0];
  return value ? Number(value) : 0;
}

async function main() {
  const standardsPath = process.env.STANDARDS_XLSX;
  const sourcesPath = process.env.SOURCES_DOCX;
  if (!standardsPath || !sourcesPath) {
    throw new Error("Set STANDARDS_XLSX and SOURCES_DOCX before importing");
  }

  const workbook = await readWorkbook(standardsPath);
  const documents: RawStandardDocument[] = workbook.documents.map((row) => ({
    standardNo: row["标准号 / 文件编号"] ?? "未编号",
    version: row["版本号"] ?? "未标注",
    fileName: row["原文件名"] ?? "",
  }));
  const summaries: RawStandardSummary[] = workbook.summaries.map((row) => ({
    standardNo: row["标准号 / 编号"] ?? "",
    title: row["标准名称"] ?? "",
    issuers: row["发布机构"] ?? "",
    system: row["涉及知识库"] ?? "其他标准",
  }));

  const standards = normalizeStandardRows(documents, summaries);
  const sourceDocument = await readSourceDocument(sourcesPath);
  const sources = normalizeSourceLinks(sourceDocument.links);
  const importedAt = new Date().toISOString();

  const report: ImportReport = {
    standards: {
      visibleRows: documents.length,
      summaryRows: summaries.length,
      workbookReportedDocuments: numberFromStats(workbook.stats, "文档总数"),
      workbookReportedIdentifiers: numberFromStats(
        workbook.stats,
        "去重后标准/文件编号数",
      ),
    },
    sources: {
      extractedUrls: sources.length,
      sectionReportedItems: sourceDocument.sectionReportedItems,
    },
    notes: [
      "统计页面与可见明细的文档数不一致，页面同时保留两个口径。",
      "信源文档部分栏目标注数量高于实际可提取链接数，未虚构补齐。",
      `标准数据导入时间：${importedAt}`,
    ],
  };

  const dataDir = resolve("src/data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    resolve(dataDir, "standards.json"),
    `${JSON.stringify(standards, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    resolve(dataDir, "sources.json"),
    `${JSON.stringify(sources, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    resolve(dataDir, "import-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        standards: standards.length,
        summaries: summaries.length,
        sources: sources.length,
        output: dirname(resolve(dataDir, "standards.json")),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
