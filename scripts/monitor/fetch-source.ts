export interface FetchResult {
  body: string;
  status: number;
  etag?: string;
  lastModified?: string;
  notModified: boolean;
  finalUrl: string;
}

export interface ConditionalHeaders {
  etag?: string;
  lastModified?: string;
}

export async function fetchSource(
  url: string,
  conditional: ConditionalHeaders = {},
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const headers: Record<string, string> = {
    "User-Agent":
      "SeatScope-M1-Regulation-Radar/0.1 (+https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar)",
    Accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.7",
  };
  if (conditional.etag) headers["If-None-Match"] = conditional.etag;
  if (conditional.lastModified) {
    headers["If-Modified-Since"] = conditional.lastModified;
  }

  try {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.status === 304) {
      return {
        body: "",
        status: 304,
        etag: response.headers.get("etag") ?? conditional.etag,
        lastModified:
          response.headers.get("last-modified") ?? conditional.lastModified,
        notModified: true,
        finalUrl: response.url || url,
      };
    }
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} for ${response.url || url}`,
      );
    }
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > 8_000_000) {
      throw new Error(`Source response is too large: ${contentLength} bytes`);
    }
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > 8_000_000) {
      throw new Error("Source response exceeded the 8 MB safety limit");
    }
    return {
      body,
      status: response.status,
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
      notModified: false,
      finalUrl: response.url || url,
    };
  } finally {
    clearTimeout(timeout);
  }
}
