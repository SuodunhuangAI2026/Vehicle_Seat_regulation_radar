import type {
  RegulationChange,
  SourceHealth,
  SourceRecord,
  StandardRecord,
} from "../types";

export interface ChangeFilters {
  query?: string;
  system?: string;
  issuer?: string;
  changeType?: string;
  severity?: string;
  reviewStatus?: string;
  from?: string;
  to?: string;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeStandardKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_/（）()]+/g, "");
}

export function standardFamilyKey(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .replace(/[（(]\s*征求意见稿\s*[）)]\s*$/i, "")
    .replace(/[-—–]\s*(?:19|20)\d{2}\s*$/i, "")
    .replace(/[-—–]\s*20[0-9]X\s*$/i, "")
    .trim();
  return normalizeStandardKey(normalized);
}

export function filterChanges(
  changes: RegulationChange[],
  filters: ChangeFilters,
): RegulationChange[] {
  const query = normalizeSearch(filters.query ?? "");
  return changes.filter((change) => {
    const searchable = normalizeSearch(
      [
        ...change.standardNumbers,
        change.title,
        change.summaryZh,
        ...change.impactedDesignAreas,
        ...change.impactedTestMethods,
      ].join(" "),
    );
    const detectedDate = change.detectedAt.slice(0, 10);
    return (
      (!query || searchable.includes(query)) &&
      (!filters.system || change.system === filters.system) &&
      (!filters.issuer || change.issuer === filters.issuer) &&
      (!filters.changeType || change.changeType === filters.changeType) &&
      (!filters.severity || change.severity === filters.severity) &&
      (!filters.reviewStatus ||
        change.reviewStatus === filters.reviewStatus) &&
      (!filters.from || detectedDate >= filters.from) &&
      (!filters.to || detectedDate <= filters.to)
    );
  });
}

export function filterStandards(
  standards: StandardRecord[],
  filters: {
    query?: string;
    system?: string;
    issuer?: string;
    status?: string;
    monitored?: string;
  },
): StandardRecord[] {
  const query = normalizeStandardKey(filters.query ?? "");
  return standards.filter((standard) => {
    const searchable = normalizeStandardKey(
      [
        standard.standardNo,
        standard.title,
        standard.version,
        standard.sourceFileName,
      ].join(" "),
    );
    return (
      (!query || searchable.includes(query)) &&
      (!filters.system || standard.system === filters.system) &&
      (!filters.issuer || standard.issuer === filters.issuer) &&
      (!filters.status || standard.status === filters.status) &&
      (!filters.monitored ||
        (filters.monitored === "yes" ? standard.monitored : !standard.monitored))
    );
  });
}

export function filterSources(
  sources: SourceRecord[],
  filters: {
    query?: string;
    category?: string;
    mode?: string;
    status?: string;
  },
  health: SourceHealth[] = [],
): SourceRecord[] {
  const query = normalizeSearch(filters.query ?? "");
  const healthById = new Map(health.map((entry) => [entry.sourceId, entry]));
  return sources.filter((source) => {
    const searchable = normalizeSearch(
      [source.name, source.url, source.category, source.adapterId ?? ""].join(" "),
    );
    const currentHealth = healthById.get(source.id);
    return (
      (!query || searchable.includes(query)) &&
      (!filters.category || source.category === filters.category) &&
      (!filters.mode || source.monitoringMode === filters.mode) &&
      (!filters.status || currentHealth?.status === filters.status)
    );
  });
}

export function groupStandards(
  standards: StandardRecord[],
): Array<{ key: string; label: string; records: StandardRecord[] }> {
  const groups = new Map<
    string,
    { key: string; label: string; records: StandardRecord[] }
  >();
  for (const standard of standards) {
    const standardNo = standard.standardNo.trim();
    const isPlaceholder =
      !standardNo || standardNo === "—" || standardNo === "-";
    const key = isPlaceholder
      ? `title:${normalizeStandardKey(standard.title)}`
      : `no:${standardFamilyKey(standardNo)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.records.push(standard);
    } else {
      groups.set(key, {
        key,
        label: isPlaceholder ? standard.title : standardNo,
        records: [standard],
      });
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "zh-CN", { numeric: true }),
  );
}
