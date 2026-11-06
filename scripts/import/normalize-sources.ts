import { createHash } from "node:crypto";
import type { SourceRecord } from "../../src/types/index.js";

export interface RawSourceLink {
  name: string;
  url: string;
  category?: string;
  bookmarkLocation?: string;
}

const CATEGORY_UNECE = "UNECE / WP.29 全球统一法规";
const CATEGORY_EU = "欧盟法规与协调标准";
const CATEGORY_CN = "中国国家标准与强制性法规";
const CATEGORY_US = "美国联邦机动车安全法规";
const CATEGORY_CA = "加拿大机动车安全法规";
const CATEGORY_ADR = "澳大利亚设计规则";
const CATEGORY_APAC = "亚太其他国家与地区";
const CATEGORY_GLOBAL = "全球法规指南与其他市场";
const CATEGORY_NCAP = "全球新车评价规程与保险安全指数";
const CATEGORY_STANDARDS = "国际与行业标准文本";
const CATEGORY_ORGS = "标准组织、标准检索与检测认证机构";

const adapterRules: Array<{
  adapterId: string;
  test: (url: URL) => boolean;
}> = [
  {
    adapterId: "unece",
    test: (url) =>
      url.hostname.endsWith("unece.org") &&
      url.pathname.includes("un-regulations-addenda-1958-agreement"),
  },
  {
    adapterId: "ecfr",
    test: (url) => url.hostname.endsWith("ecfr.gov"),
  },
  {
    adapterId: "nhtsa",
    test: (url) =>
      url.hostname.endsWith("nhtsa.gov") &&
      url.pathname.includes("/laws-regulations/fmvss"),
  },
  {
    adapterId: "transport-canada",
    test: (url) =>
      url.hostname.endsWith("tc.canada.ca") &&
      url.pathname.includes("regulatory-change"),
  },
];

function stableId(value: string): string {
  return `src-${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

export function normalizeSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function classifySourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (host.endsWith("unece.org")) return CATEGORY_UNECE;
  if (
    host.endsWith("eur-lex.europa.eu") ||
    host.endsWith("echa.europa.eu") ||
    host === "europa.eu" ||
    host.endsWith(".europa.eu") ||
    host === "ec.europa.eu"
  ) {
    return CATEGORY_EU;
  }
  if (
    host.endsWith("samr.gov.cn") ||
    host.endsWith("gb688.cn") ||
    host.endsWith("cnca.gov.cn") ||
    host.endsWith("miit.gov.cn") ||
    host.endsWith("autoinfo.gov.cn") ||
    host.endsWith("catarc-cert.cn") ||
    host.endsWith("tatc.com.cn") ||
    host.endsWith("cvtsc.org.cn") ||
    host.endsWith("caeri.com.cn") ||
    host.endsWith("spc.net.cn") ||
    host.endsWith("doc88.com")
  ) {
    return CATEGORY_CN;
  }
  if (host.endsWith("nhtsa.gov") && path.startsWith("/ratings")) {
    return CATEGORY_NCAP;
  }
  if (
    host.endsWith("ecfr.gov") ||
    host.endsWith("govinfo.gov") ||
    host.endsWith("nhtsa.gov") ||
    host.endsWith("regulations.gov") ||
    host.endsWith("federalregister.gov")
  ) {
    return CATEGORY_US;
  }
  if (
    host.endsWith("tc.canada.ca") ||
    host.endsWith("laws-lois.justice.gc.ca")
  ) {
    return CATEGORY_CA;
  }
  if (
    host.endsWith("infrastructure.gov.au") ||
    host.endsWith("legislation.gov.au")
  ) {
    return CATEGORY_ADR;
  }
  if (
    host.endsWith("bis.gov.in") ||
    host.endsWith("law.go.kr") ||
    host.endsWith("jisc.go.jp") ||
    host.endsWith("araiindia.com") ||
    host.endsWith("icat.in") ||
    host.endsWith("luatvietnam.vn") ||
    host.endsWith("elegislation.gov.hk") ||
    host.endsWith("tncap.org.tw") ||
    host.endsWith("mt.gov.vn") ||
    host.endsWith("bjxwk.com")
  ) {
    return CATEGORY_APAC;
  }
  if (
    host.endsWith("acea.auto") ||
    host.endsWith("auto-testing.net") ||
    host.endsWith("atic-zh.com") ||
    host.endsWith("ceaode.com") ||
    host.endsWith("tbtmap.cn")
  ) {
    return CATEGORY_GLOBAL;
  }
  if (
    host.endsWith("kncap.org") ||
    host.endsWith("latinncap.com") ||
    host.endsWith("ancap.com.au") ||
    host.endsWith("c-ncap.org.cn") ||
    host.endsWith("c-ncap.org") ||
    host.endsWith("ciasi.org.cn") ||
    host.endsWith("euroncap.com") ||
    host.endsWith("nasva.go.jp") ||
    host.endsWith("aseancap.org") ||
    host.endsWith("iihs.org") ||
    host.endsWith("globalncap.org") ||
    host.endsWith("thatcham.org") ||
    host.endsWith("rcar.org")
  ) {
    return CATEGORY_NCAP;
  }
  if (
    host.endsWith("iso.org") ||
    host.endsWith("sae.org") ||
    host.endsWith("vda.de")
  ) {
    return CATEGORY_STANDARDS;
  }
  return CATEGORY_ORGS;
}

function adapterFor(url: URL): string | undefined {
  return adapterRules.find((rule) => rule.test(url))?.adapterId;
}

export function normalizeSourceLinks(
  links: RawSourceLink[],
): SourceRecord[] {
  const result = new Map<string, SourceRecord>();

  for (const link of links) {
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeSourceUrl(link.url);
    } catch {
      continue;
    }

    if (result.has(normalizedUrl)) {
      const current = result.get(normalizedUrl)!;
      if (link.name.length > current.name.length) {
        current.name = link.name.trim();
      }
      continue;
    }

    const url = new URL(normalizedUrl);
    const adapterId = adapterFor(url);
    const category = link.category?.trim() || classifySourceUrl(normalizedUrl);
    result.set(normalizedUrl, {
      id: stableId(normalizedUrl),
      name: link.name.trim() || url.hostname,
      url: normalizedUrl,
      category,
      bookmarkLocation: link.bookmarkLocation?.trim() || undefined,
      monitoringMode: adapterId ? "automated" : "catalogued",
      adapterId,
    });
  }

  return [...result.values()];
}
