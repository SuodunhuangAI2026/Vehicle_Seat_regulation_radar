# Vehicle Seat Regulation Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a static M1 seat-regulation intelligence site with scheduled GitHub Actions monitoring, DeepSeek-assisted HTML review reports, and manual Feishu review.

**Architecture:** Vite + React + TypeScript produces a hash-routed static application deployed to GitHub Pages. A Node monitor pipeline fetches configured official sources, stores only normalized snapshots, validates DeepSeek JSON with Zod, and commits typed JSON plus standalone HTML reports before rebuilding the site.

**Tech Stack:** Node.js 24, Vite, React, TypeScript, React Router, Zod, Vitest, Testing Library, Cheerio, fast-xml-parser, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-05-vehicle-seat-regulation-radar-design.md`

## Global Constraints

- Product name is exactly `SeatScope · M1 座椅法规雷达 · 锁老师`; short label is `SeatScope`.
- Repository is `SuodunhuangAI2026/Vehicle_Seat_regulation_radar`.
- Public URL is `https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/`.
- Hosting is GitHub Pages only; there is no server, database, queue, or runtime API.
- DeepSeek is called only from the monitor process or GitHub Actions.
- `DEEPSEEK_API_KEY` must never be committed.
- Feishu delivery is manual; no Feishu webhook is implemented.
- Preserve both source-count values: 141 visible document rows and the workbook-reported 155 documents; 92 extracted URLs and the larger section labels.
- Do not commit the original XLSX, DOCX, private standards, or confidential company files.
- All generated report text must be HTML-escaped; raw model HTML is never rendered.
- The React application may require JavaScript, but standalone report files must not.
- The UI must support mobile and desktop and respect `prefers-reduced-motion`.

## Review Focus

- A source-count mismatch must remain visible and must not crash import or produce invented records.
- A missing DeepSeek key must leave source health updated, create no fabricated report, and keep the site usable.
- Malformed model JSON or unsupported fields must be rejected, with the change retained as `unassessed`.
- One failed or blocked source must not stop the other adapters, and the failure must appear in source health.
- Model or source text containing HTML/script syntax must render as text, never execute.
- Direct asset and report URLs must work under `/Vehicle_Seat_regulation_radar/` after deployment.

## File Structure

```text
.github/workflows/monitor-and-deploy.yml
src/
  App.tsx
  main.tsx
  components/
    AppShell.tsx
    ChangeCard.tsx
    DataQualityNote.tsx
    MetricCard.tsx
    ReportCard.tsx
    StatusBadge.tsx
  data/
    changes.json
    import-report.json
    meta.json
    reports.json
    sources.json
    standards.json
  lib/
    filters.ts
    format.ts
    report-copy.ts
  pages/
    AboutPage.tsx
    ChangeDetailPage.tsx
    ChangesPage.tsx
    OverviewPage.tsx
    ReportsPage.tsx
    SourcesPage.tsx
    StandardDetailPage.tsx
    StandardsPage.tsx
  styles/
    app.css
    tokens.css
  types/index.ts
scripts/
  import/
    import-inputs.ts
    normalize-standards.ts
    normalize-sources.ts
  monitor/
    adapters.ts
    deepseek.ts
    diff.ts
    fetch-source.ts
    index.ts
    report-html.ts
    state.ts
    adapters/
      ecfr.ts
      nhtsa.ts
      transport-canada.ts
      unece.ts
  review.ts
monitor/state/snapshots.json
public/reports/
tests/
  fixtures/
  app-shell.test.tsx
  data-import.test.ts
  filters.test.ts
  monitoring.test.ts
  report.test.ts
  review.test.ts
```

---

### Task 1: Scaffold the application and prove the shell

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Create: `tests/setup.ts`
- Create: `tests/app-shell.test.tsx`
- Create: `tests/fixtures/empty-data.ts`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: none.
- Produces: `AppShell({ children }: { children: React.ReactNode })`, route paths `/`, `/changes`, `/standards`, `/sources`, `/reports`, `/about`.

- [ ] **Step 1: Write the failing shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/App";

it("shows the approved product identity and primary routes", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByText("SeatScope · M1 座椅法规雷达 · 锁老师")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "变更雷达" })).toHaveAttribute("href", "/changes");
  expect(screen.getByRole("link", { name: "标准库" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "信源中心" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/app-shell.test.tsx`
Expected: FAIL because `src/App.tsx` does not exist.

- [ ] **Step 3: Add the package and test configuration**

```json
{
  "name": "vehicle-seat-regulation-radar",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false",
    "monitor": "tsx scripts/monitor/index.ts",
    "review": "tsx scripts/review.ts",
    "import:inputs": "tsx scripts/import/import-inputs.ts"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "exceljs": "^4.4.0",
    "fast-xml-parser": "^5.0.0",
    "jsdom": "^25.0.0",
    "jszip": "^3.10.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

`vite.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS && repository ? `/${repository}/` : "/",
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    css: true,
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "scripts"]
}
```

`tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`.env.example`:

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
STANDARDS_XLSX=
SOURCES_DOCX=
```

`.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
*.xlsx
*.docx
monitor/tmp/
```

- [ ] **Step 4: Implement the minimal shell**

```tsx
// src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";

const routes = [
  ["/", "总览"],
  ["/changes", "变更雷达"],
  ["/standards", "标准库"],
  ["/sources", "信源中心"],
  ["/reports", "审核稿"],
  ["/about", "方法与说明"],
] as const;

export function App() {
  return (
    <AppShell>
      <Routes>
        {routes.map(([path, label]) => (
          <Route key={path} path={path} element={<h1>{label}</h1>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
```

```tsx
// src/components/AppShell.tsx
import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const links = [
  ["/", "总览"],
  ["/changes", "变更雷达"],
  ["/standards", "标准库"],
  ["/sources", "信源中心"],
  ["/reports", "审核稿"],
  ["/about", "方法与说明"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true" />
          <span>SeatScope · M1 座椅法规雷达 · 锁老师</span>
        </Link>
        <nav aria-label="主导航">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

Use `HashRouter` in `src/main.tsx`, and keep `MemoryRouter` in tests.

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./styles/tokens.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 5: Run test, typecheck, and build**

Run: `npm test -- tests/app-shell.test.tsx`
Expected: PASS.

Run: `npm run typecheck && npm run build`
Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src tests .gitignore .env.example
git commit -m "feat: scaffold SeatScope application shell"
```

---

### Task 2: Define domain types and import normalized input data

**Files:**
- Create: `src/types/index.ts`
- Create: `scripts/import/normalize-standards.ts`
- Create: `scripts/import/normalize-sources.ts`
- Create: `scripts/import/import-inputs.ts`
- Create: `src/data/standards.json`
- Create: `src/data/sources.json`
- Create: `src/data/import-report.json`
- Create: `tests/data-import.test.ts`

**Interfaces:**
- Consumes: `STANDARDS_XLSX` and `SOURCES_DOCX` environment variables.
- Produces: `StandardRecord`, `SourceRecord`, `ImportReport`, and normalized JSON files.

`src/types/index.ts`:

```ts
export type StandardStatus = "active" | "draft" | "superseded" | "unknown";

export interface StandardRecord {
  id: string;
  standardNo: string;
  title: string;
  version: string;
  issuer: string;
  system: string;
  documentKind: string;
  sourceFileName: string;
  sourceUrl?: string;
  status: StandardStatus;
  monitored: boolean;
  importedAt: string;
}

export interface SourceRecord {
  id: string;
  name: string;
  url: string;
  category: string;
  bookmarkLocation?: string;
  monitoringMode: "automated" | "catalogued" | "unsupported";
  adapterId?: string;
}

export interface ImportReport {
  standards: {
    visibleRows: number;
    summaryRows: number;
    workbookReportedDocuments: number;
    workbookReportedIdentifiers: number;
  };
  sources: {
    extractedUrls: number;
    sectionReportedItems: number;
  };
  notes: string[];
}

export type ChangeType =
  | "new" | "revision" | "amendment" | "corrigendum" | "supplement"
  | "replacement" | "repeal" | "translation-only" | "status-change"
  | "draft" | "unknown";

export type Severity = "critical" | "high" | "medium" | "low" | "unassessed";
export type ReviewStatus = "draft" | "approved" | "rejected" | "superseded";

export interface RegulationChange {
  id: string;
  standardIds: string[];
  standardNumbers: string[];
  title: string;
  system: string;
  issuer: string;
  changeType: ChangeType;
  severity: Severity;
  oldVersion?: string;
  newVersion?: string;
  detectedAt: string;
  publicationDate?: string;
  commentStart?: string;
  commentEnd?: string;
  approvalDate?: string;
  effectiveDate?: string;
  transitionEnd?: string;
  repealDate?: string;
  summaryZh: string;
  impactedDesignAreas: string[];
  impactedTestMethods: string[];
  recommendedActions: string[];
  evidence: Array<{ label: string; url: string; quote?: string }>;
  confidence: "high" | "medium" | "low";
  reviewStatus: ReviewStatus;
  reportPath?: string;
  model: string;
  promptVersion: string;
}
```

- [ ] **Step 1: Write normalization tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeStandardRows } from "../../scripts/import/normalize-standards";

it("joins summary metadata and preserves duplicate-version documents", () => {
  const documents = [
    { standardNo: "UN R17", version: "Rev.7", fileName: "R017r7e.pdf" },
    { standardNo: "UN R17", version: "Rev.7 / Amd.1", fileName: "R017r7am1e.pdf" },
  ];
  const summaries = [
    {
      standardNo: "UN R17",
      title: "座椅、座椅固定装置及头枕",
      issuers: "UNECE（联合国）",
      system: "ECE",
    },
  ];
  expect(normalizeStandardRows(documents, summaries)).toHaveLength(2);
  expect(normalizeStandardRows(documents, summaries)[0].issuer).toContain("UNECE");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/data-import.test.ts`
Expected: FAIL because `normalizeStandardRows` does not exist.

- [ ] **Step 3: Implement normalization**

`normalize-standards.ts` must:

- Assign stable IDs with `slugify(standardNo + "-" + version + "-" + index)`.
- Join document rows to summary rows by exact standard number.
- Use source file name when the summary title is absent.
- Mark `202X`, `草案`, or `征求意见稿` as `draft`.
- Mark a document `active` when no override is known.
- Keep duplicates as separate records.

`normalize-sources.ts` must:

- Read external hyperlink relationships from `word/_rels/document.xml.rels`.
- Deduplicate by URL.
- Infer category from the nearest numbered section heading, with a deterministic
  domain classifier as fallback when the heading cannot be recovered.
- Set `automated` and `adapterId` only for the four configured domains.
- Set all other sources to `catalogued`.

Use the installed ZIP libraries rather than a native Office dependency:

```ts
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { readFile } from "node:fs/promises";

export async function readWorkbookRows(path: string) {
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

export async function readExternalLinks(path: string) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rels);
  const relationships = parsed.Relationships.Relationship;
  return (Array.isArray(relationships) ? relationships : [relationships])
    .filter((rel: { "@_TargetMode"?: string }) => rel["@_TargetMode"] === "External")
    .map((rel: { "@_Target": string }) => rel["@_Target"]);
}
```

`sheetRows` converts ExcelJS row values to `Record<string, string>` using the first
row as the header and trims whitespace. `readExternalLinks` is paired with the
document's paragraph headings to infer a category; unknown URLs fall back to
`其他标准来源`.

- [ ] **Step 4: Generate real data and the import report**

Run with the local source paths set:

```powershell
$env:STANDARDS_XLSX='C:\Users\uyuez002\OneDrive - 宁波继峰汽车零部件股份有限公司\桌面\JF AI 非企业标准清单_20261105.xlsx'
$env:SOURCES_DOCX='C:\Users\uyuez002\Downloads\Edge收藏夹_法规与标准网址清单.docx'
npm run import:inputs
```

Expected:

- `src/data/standards.json` has 141 visible records.
- `src/data/sources.json` has 92 records.
- `src/data/import-report.json` records 141/107/155/111 and 92/117 counts.
- No XLSX or DOCX file is copied into the repository.

- [ ] **Step 5: Run tests and validation**

Run: `npm test -- tests/data-import.test.ts`
Expected: PASS.

Run: `node -e "const d=require('./src/data/standards.json'); if(d.length!==141) process.exit(1); console.log('standards', d.length)"`
Expected: prints `standards 141`.

Run: `node -e "const d=require('./src/data/sources.json'); if(d.length!==92) process.exit(1); console.log('sources', d.length)"`
Expected: prints `sources 92`.

- [ ] **Step 6: Commit**

```bash
git add src/types src/data scripts/import tests/data-import.test.ts
git commit -m "feat: import standards and regulation sources"
```

---

### Task 3: Build the visual system and overview page

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/app.css`
- Create: `src/components/MetricCard.tsx`
- Create: `src/components/ChangeCard.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/DataQualityNote.tsx`
- Create: `src/pages/OverviewPage.tsx`
- Modify: `src/App.tsx`
- Create: `tests/overview.test.tsx`

**Interfaces:**
- Consumes: JSON data and `ChangeRecord` from Task 2/4.
- Produces: `OverviewPage`, `MetricCard`, `StatusBadge`, `ChangeCard`.

- [ ] **Step 1: Write the overview test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OverviewPage } from "../src/pages/OverviewPage";
import { sampleChanges, sampleStandards, sampleSources } from "./fixtures/empty-data";

it("renders metrics, source health, and the latest change", () => {
  render(
    <MemoryRouter>
      <OverviewPage
        standards={sampleStandards}
        sources={sampleSources}
        changes={sampleChanges}
        meta={{ lastSuccessfulRun: "2026-11-05T08:00:00+08:00" }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText("标准记录")).toBeInTheDocument();
  expect(screen.getByText("待审核")).toBeInTheDocument();
  expect(screen.getByText("UN R17 Rev.7")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/overview.test.tsx`
Expected: FAIL because page and components do not exist.

- [ ] **Step 3: Implement the design tokens and shell**

Use the exact palette from the spec. Add:

- Paper background with a low-opacity radial grid.
- Serif display headings and tabular numerals.
- Orange primary accent and navy structural surfaces.
- Sticky desktop navigation; mobile horizontal route strip.
- Visible `:focus-visible` outline.
- `@media (prefers-reduced-motion: reduce)` disabling transforms and pulses.

- [ ] **Step 4: Implement overview content**

The page must render:

- Hero with `SeatScope`, reviewer label, last run, and monitoring status.
- Four metric cards: standards, sources, changed this cycle, awaiting review.
- Latest three changes using `ChangeCard`.
- Source health summary calculated from `meta.sourceHealth`.
- A compact data-quality note for the 141/155 and 92/117 discrepancies.

- [ ] **Step 5: Run component test and build**

Run: `npm test -- tests/overview.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/components src/pages src/App.tsx tests/overview.test.tsx tests/fixtures
git commit -m "feat: add SeatScope overview experience"
```

---

### Task 4: Implement change radar and change detail

**Files:**
- Create: `src/pages/ChangesPage.tsx`
- Create: `src/pages/ChangeDetailPage.tsx`
- Create: `src/lib/filters.ts`
- Create: `src/lib/format.ts`
- Create: `tests/filters.test.ts`
- Create: `tests/changes-page.test.tsx`

**Interfaces:**
- Consumes: `RegulationChange[]`, route param `id`.
- Produces: `filterChanges(changes, filters)`, `formatDate(value)`, and both routes.

```ts
export interface ChangeFilters {
  query?: string;
  system?: string;
  changeType?: string;
  severity?: string;
  reviewStatus?: string;
}

export function filterChanges(
  changes: RegulationChange[],
  filters: ChangeFilters,
): RegulationChange[];
```

- [ ] **Step 1: Write filter tests**

```ts
it("searches standard number, Chinese summary, and test method", () => {
  const result = filterChanges(sampleChanges, { query: "头枕" });
  expect(result.map((change) => change.id)).toEqual(["change-headrest"]);
});

it("combines severity and review status without dropping matching rows", () => {
  const result = filterChanges(sampleChanges, {
    severity: "high",
    reviewStatus: "draft",
  });
  expect(result).toHaveLength(1);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- tests/filters.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement filters and routes**

- Case-insensitive search over `standardNumbers`, `title`, `summaryZh`,
  `impactedDesignAreas`, and `impactedTestMethods`.
- Unknown dates render `未确认`, never an empty dash.
- Detail page shows timeline, evidence links, impact sections, and review state.
- `ChangesPage` has URL-synced filters using `useSearchParams`.

- [ ] **Step 4: Seed only defensible library observations**

Generate `changes.json` with no invented dates or clause changes. Seed three
observations from the supplied workbook:

- GB 14166 has 2013 and 2024 versions in the library.
- GB 14167 has 2013 and 2024 versions in the library.
- GB 15083 has both a 2019 version and a 202X draft.

Each seed has `severity: "unassessed"`, `reviewStatus: "draft"`, confidence
`high` for the version coexistence fact, and a summary that explicitly says the
official change details still require verification.

- [ ] **Step 5: Test and verify**

Run: `npm test -- tests/filters.test.ts tests/changes-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ChangesPage.tsx src/pages/ChangeDetailPage.tsx src/lib src/data/changes.json tests
git commit -m "feat: add regulation change radar"
```

---

### Task 5: Implement the standards library and detail page

**Files:**
- Create: `src/pages/StandardsPage.tsx`
- Create: `src/pages/StandardDetailPage.tsx`
- Create: `tests/standards-page.test.tsx`

**Interfaces:**
- Consumes: `StandardRecord[]`.
- Produces: grouped standard cards and detail routes.

- [ ] **Step 1: Write the failing library test**

```tsx
it("filters standards by system and opens a record", () => {
  render(
    <MemoryRouter>
      <StandardsPage standards={sampleStandards} />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("体系"), { target: { value: "ECE" } });
  expect(screen.getByText("UN R17 Rev.7")).toBeInTheDocument();
  expect(screen.queryByText("GB 15083-2019")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Implement grouping and filters**

- Group by normalized standard number.
- Search ignores spaces, hyphens, and full-width punctuation.
- Show document count and distinct versions.
- Render system, issuer, version, file name, and source link.
- Keep the data-quality note visible above the table.

```ts
export function normalizeStandardKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_/（）()]+/g, "");
}

export function filterStandards(
  standards: StandardRecord[],
  filters: { query?: string; system?: string; issuer?: string },
): StandardRecord[] {
  const query = normalizeStandardKey(filters.query ?? "");
  return standards.filter((standard) => {
    const searchable = normalizeStandardKey(
      [standard.standardNo, standard.title, standard.version].join(" "),
    );
    return (
      (!query || searchable.includes(query)) &&
      (!filters.system || standard.system === filters.system) &&
      (!filters.issuer || standard.issuer === filters.issuer)
    );
  });
}
```

- [ ] **Step 3: Implement detail page**

Show all metadata, duplicate/alternative versions, linked change observations, and
a safe external source link. If `sourceUrl` is absent, show `源文件未提供公开链接`
and do not generate a search URL that could be mistaken for an official source.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/standards-page.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/StandardsPage.tsx src/pages/StandardDetailPage.tsx tests/standards-page.test.tsx
git commit -m "feat: add standards library"
```

---

### Task 6: Implement the source center

**Files:**
- Create: `src/pages/SourcesPage.tsx`
- Create: `tests/sources-page.test.tsx`

**Interfaces:**
- Consumes: `SourceRecord[]`, `meta.sourceHealth`.
- Produces: category-filtered source cards with monitoring mode and health.

- [ ] **Step 1: Write the failing source-center test**

```tsx
it("shows all categories and distinguishes automated from catalogued sources", () => {
  render(
    <MemoryRouter>
      <SourcesPage sources={sampleSources} health={sampleHealth} />
    </MemoryRouter>,
  );
  expect(screen.getByText("UNECE / WP.29 全球统一法规")).toBeInTheDocument();
  expect(screen.getByText("自动监控")).toBeInTheDocument();
  expect(screen.getByText("人工浏览")).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement source cards**

- Category chips with counts.
- Search by title and URL.
- Mode badge: `自动监控`, `人工浏览`, `暂不支持自动抓取`.
- Source health row: last checked, last success, error summary.
- External links use `target="_blank"` and `rel="noreferrer noopener"`.

```tsx
<a href={source.url} target="_blank" rel="noreferrer noopener">
  {source.name}
</a>
```

- [ ] **Step 3: Add source-count disclosure**

Display:

`已从文档提取 92 个唯一网址；原文档部分栏目标注数量更高，缺失项未被虚构补齐。`

- [ ] **Step 4: Verify**

Run: `npm test -- tests/sources-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SourcesPage.tsx tests/sources-page.test.tsx
git commit -m "feat: add regulation source center"
```

---

### Task 7: Implement reports and human review state

**Files:**
- Create: `src/pages/ReportsPage.tsx`
- Create: `src/lib/report-copy.ts`
- Create: `scripts/review.ts`
- Create: `src/data/reports.json`
- Create: `public/reports/.gitkeep`
- Create: `tests/review.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `ReportRecord[]`.
- Produces: `reviewReport(reports, reportId, decision, now): ReportRecord[]`, report cards, copy-summary action.

```ts
// Append to src/types/index.ts
export interface ReportRecord {
  id: string;
  title: string;
  generatedAt: string;
  changeIds: string[];
  severity: string;
  reviewStatus: ReviewStatus;
  reviewedAt?: string;
  htmlPath: string;
  summary: string;
}
```

- [ ] **Step 1: Write the failing review test**

```ts
it("preserves the report and changes only review state when approved", () => {
  const before = [{ id: "r1", reviewStatus: "draft", title: "Report" }] as ReportRecord[];
  const after = reviewReport(before, "r1", "approved", "2026-11-05T12:00:00Z");
  expect(after[0].reviewStatus).toBe("approved");
  expect(after[0].title).toBe("Report");
  expect(after[0].reviewedAt).toBe("2026-11-05T12:00:00Z");
});
```

- [ ] **Step 2: Implement review command**

`npm run review -- r1 --approve` updates `reports.json`, rewrites the corresponding
HTML review badge, and prints the approved Feishu copy. Invalid IDs exit non-zero.

- [ ] **Step 3: Implement reports page**

- Status filter.
- Open HTML report in a new tab.
- Download link uses the `download` attribute.
- Copy action is shown only when `reviewStatus === "approved"`.
- Copy text includes standard numbers, impact, deadline, evidence links, and
  `审核人：锁老师`.

- [ ] **Step 4: Verify**

Run: `npm test -- tests/review.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ReportsPage.tsx src/lib/report-copy.ts scripts/review.ts src/data/reports.json public/reports tests/review.test.ts
git commit -m "feat: add report archive and review workflow"
```

---

### Task 8: Implement source adapters and snapshot diffing

**Files:**
- Create: `scripts/monitor/adapters.ts`
- Create: `scripts/monitor/fetch-source.ts`
- Create: `scripts/monitor/diff.ts`
- Create: `scripts/monitor/state.ts`
- Create: `scripts/monitor/adapters/ecfr.ts`
- Create: `scripts/monitor/adapters/unece.ts`
- Create: `scripts/monitor/adapters/nhtsa.ts`
- Create: `scripts/monitor/adapters/transport-canada.ts`
- Create: `scripts/monitor/index.ts`
- Create: `monitor/state/snapshots.json`
- Create: `tests/monitoring.test.ts`
- Create: `tests/fixtures/ecfr.xml`
- Create: `tests/fixtures/unece.html`

**Interfaces:**
- Consumes: `SourceRecord[]`.
- Produces: `SourceAdapter`, `SourceSnapshot`, `diffSnapshot(previous, next)`.

```ts
export interface SourceItem {
  key: string;
  title: string;
  url: string;
  version?: string;
  publishedAt?: string;
}

export interface SourceSnapshot {
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  hash: string;
  title: string;
  items: SourceItem[];
  excerpt: string;
}

export interface SourceAdapter {
  id: string;
  matches(source: SourceRecord): boolean;
  fetch(source: SourceRecord): Promise<SourceSnapshot>;
}

export interface SourceHealth {
  sourceId: string;
  status: "unchanged" | "changed" | "failed" | "skipped";
  checkedAt: string;
  lastSuccessAt?: string;
  error?: string;
}

export interface MonitorOptions {
  sources: SourceRecord[];
  adapters: SourceAdapter[];
  analyze: (
    source: SourceRecord,
    snapshot: SourceSnapshot,
    diff: ReturnType<typeof diffSnapshot>,
  ) => Promise<RegulationChange | null>;
  now?: () => Date;
}

export interface MonitorRun {
  health: SourceHealth[];
  changes: RegulationChange[];
}

export async function runMonitor(options: MonitorOptions): Promise<MonitorRun>;

export function diffSnapshot(
  previous: SourceSnapshot | undefined,
  next: SourceSnapshot,
): { changed: boolean; added: SourceItem[]; removed: SourceItem[]; changedItems: SourceItem[] };
```

- [ ] **Step 1: Write diff tests**

```ts
it("detects a version change without reporting unrelated unchanged items", () => {
  const previous = snapshot([{ key: "r17", title: "UN R17", url: "https://unece.org/r17", version: "Rev.7" }]);
  const next = snapshot([{ key: "r17", title: "UN R17", url: "https://unece.org/r17", version: "Rev.8" }]);
  const diff = diffSnapshot(previous, next);
  expect(diff.changed).toBe(true);
  expect(diff.changedItems[0].version).toBe("Rev.8");
});
```

- [ ] **Step 2: Write source-failure isolation test**

```ts
it("keeps successful sources when one adapter throws", async () => {
  const run = await runMonitor({
    sources: [okSource, failingSource],
    adapters: [okAdapter, failingAdapter],
    analyze: async () => null,
  });
  expect(run.health.find((row) => row.sourceId === okSource.id)?.status).toBe("unchanged");
  expect(run.health.find((row) => row.sourceId === failingSource.id)?.status).toBe("failed");
});
```

- [ ] **Step 3: Implement fetch and adapter rules**

- Timeout 20 seconds per request.
- User agent: `SeatScope-M1-Regulation-Radar/0.1`.
- Conditional `If-None-Match` and `If-Modified-Since`.
- eCFR adapter fetches the official versioner XML for 49 CFR Part 571.
- UNECE adapter parses regulation listing links and version text.
- NHTSA adapter parses the FMVSS regulations page.
- Transport Canada adapter parses the regulatory-change page.
- Every item must have an absolute official URL. Relative links are resolved
  against the source URL.
- A failed adapter records an error and does not mutate other sources.

- [ ] **Step 4: Implement the CLI**

`npm run monitor` must:

1. Load source JSON.
2. Run only `monitoringMode === "automated"`.
3. Write `monitor/state/snapshots.json`.
4. Write `src/data/meta.json` source-health data.
5. Print a compact JSON run summary.
6. Exit 0 when one source fails, but exit 1 when configuration is invalid.

- [ ] **Step 5: Verify**

Run: `npm test -- tests/monitoring.test.ts`
Expected: PASS.

Run: `npm run monitor`
Expected: without API key, exits 0 after updating source health; no report is
created.

- [ ] **Step 6: Commit**

```bash
git add scripts/monitor monitor/state src/data/meta.json tests/monitoring.test.ts tests/fixtures
git commit -m "feat: monitor official regulation sources"
```

---

### Task 9: Validate DeepSeek output and generate HTML reports

**Files:**
- Create: `scripts/monitor/deepseek.ts`
- Create: `scripts/monitor/report-html.ts`
- Create: `tests/report.test.ts`
- Create: `tests/fixtures/deepseek-valid.json`
- Create: `tests/fixtures/deepseek-malformed.json`

**Interfaces:**
- Consumes: changed source evidence and `DEEPSEEK_*` environment variables.
- Produces: validated `RegulationChange`, `renderReportHtml(change)`, and a file at
  `public/reports/<date>-<slug>.html`.

`deepseek.ts`:

```ts
export const DeepSeekChangeSchema = z.object({
  isMaterialChange: z.boolean(),
  changeType: z.enum([
    "new", "revision", "amendment", "corrigendum", "supplement",
    "replacement", "repeal", "translation-only", "status-change", "draft", "unknown",
  ]),
  titleZh: z.string().min(1),
  summaryZh: z.string().min(1),
  oldVersion: z.string().nullable(),
  newVersion: z.string().nullable(),
  publicationDate: z.string().nullable(),
  commentStart: z.string().nullable(),
  commentEnd: z.string().nullable(),
  approvalDate: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  transitionEnd: z.string().nullable(),
  repealDate: z.string().nullable(),
  impactedDesignAreas: z.array(z.string()),
  impactedTestMethods: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  evidence: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
    quote: z.string().optional(),
  })),
  confidence: z.enum(["high", "medium", "low"]),
  needsHumanReview: z.boolean(),
});

export type DeepSeekChange = z.infer<typeof DeepSeekChangeSchema>;

export function validateDeepSeekResponse(input: unknown): DeepSeekChange {
  return DeepSeekChangeSchema.parse(input);
}

export class DeepSeekValidationError extends Error {}

export async function analyzeChange(input: {
  sourceTitle: string;
  evidenceText: string;
  officialUrl: string;
  apiKey?: string;
}): Promise<DeepSeekChange | null>;

export function renderReportHtml(change: RegulationChange): string;
```

- [ ] **Step 1: Write validation and XSS tests**

```ts
it("rejects a malformed model response", () => {
  expect(() => validateDeepSeekResponse({ titleZh: "missing fields" })).toThrow();
});

it("escapes model and source text in report HTML", () => {
  const html = renderReportHtml({
    ...validChange,
    summaryZh: '<script>alert("x")</script>',
  });
  expect(html).not.toContain('<script>alert("x")</script>');
  expect(html).toContain("&lt;script&gt;");
});
```

- [ ] **Step 2: Implement DeepSeek request**

- Use `POST ${DEEPSEEK_BASE_URL}/chat/completions`.
- Send `response_format: { type: "json_object" }`.
- Prompt includes only supplied evidence and requires `null` for unknown dates.
- If `apiKey` is absent, return `null`, log `DEEPSEEK_SKIPPED`, and do not create a
  report.
- If the response fails schema validation, throw `DeepSeekValidationError`; the
  monitor creates a deterministic `unassessed` `RegulationChange` with the source
  evidence and `reviewStatus: "draft"`.

- [ ] **Step 3: Implement report generation**

- `escapeHtml(value)` for all strings.
- Use inline CSS, print styles, and a visible `待人工复核` badge for drafts.
- Include the evidence URLs as links.
- Include the Feishu-ready summary block.
- Write one file per change. Do not overwrite an approved report with a new draft
  of the same ID.

```ts
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}
```

- [ ] **Step 4: Verify**

Run: `npm test -- tests/report.test.ts`
Expected: PASS.

Run: `npm run monitor` with fixtures and no API key.
Expected: source health updates, no HTML report appears.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/deepseek.ts scripts/monitor/report-html.ts tests/report.test.ts tests/fixtures public/reports
git commit -m "feat: generate validated review reports"
```

---

### Task 10: Wire GitHub Actions, Pages, and production verification

**Files:**
- Create: `.github/workflows/monitor-and-deploy.yml`
- Create: `README.md`
- Create: `docs/deploy.md`
- Modify: `package.json` if a script or dependency changes
- Test: local build plus browser verification

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a Pages deployment and runnable scheduled workflow.

- [ ] **Step 1: Add the Pages workflow**

```yaml
name: Monitor and deploy SeatScope

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  monitor-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - uses: actions/configure-pages@v5
      - run: npm test
      - run: npm run typecheck
      - run: npm run monitor
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          DEEPSEEK_MODEL: deepseek-chat
      - name: Commit generated data
        run: |
          git config user.name "SeatScope Bot"
          git config user.email "seats-scope-bot@users.noreply.github.com"
          git add src/data public/reports monitor/state
          if ! git diff --cached --quiet; then
            git commit -m "chore: update regulation monitor data [skip ci]"
            git push
          fi
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: monitor-and-build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add deployment documentation**

`docs/deploy.md` must explain:

- Creating `SuodunhuangAI2026/Vehicle_Seat_regulation_radar`.
- Enabling Pages with GitHub Actions.
- Adding `DEEPSEEK_API_KEY` as an Actions secret.
- Running `workflow_dispatch`.
- Reviewing generated reports and manually sending them to Feishu.
- Rotating the key if it is exposed.

- [ ] **Step 3: Run complete local verification**

Run:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run monitor
```

Expected: all commands exit 0. The monitor may report source failures but must not
throw a repository-level error.

- [ ] **Step 4: Verify rendered desktop and mobile pages**

Start: `npm run dev -- --host 127.0.0.1`

Use the local Chrome/browser tooling to:

- Open the overview, changes, standards, sources, reports, and about routes.
- Take desktop and mobile screenshots.
- Confirm no horizontal overflow at 390px width.
- Confirm the source links open and the filters work.
- Confirm no browser console errors.

- [ ] **Step 5: Create the GitHub repository and push**

If `gh` is unavailable, authenticate a local browser session and create the repository
with the GitHub UI. Then run:

```bash
git remote add origin https://github.com/SuodunhuangAI2026/Vehicle_Seat_regulation_radar.git
git push -u origin main
```

Expected: the repository exists under the specified account and `main` is pushed.

- [ ] **Step 6: Configure Pages and secrets**

In repository settings:

- Pages source: GitHub Actions.
- Actions secret: `DEEPSEEK_API_KEY`.
- Optional repository variable: `DEEPSEEK_MODEL=deepseek-chat`.

Trigger `Monitor and deploy SeatScope` manually.

- [ ] **Step 7: Verify the public deployment**

Open:

`https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/`

Check:

- The approved title appears.
- CSS and JS assets load under the repository path.
- Standards and sources render.
- A standalone report path resolves.
- Browser console has no errors.

- [ ] **Step 8: Commit**

```bash
git add .github README.md docs/deploy.md
git commit -m "ci: deploy SeatScope to GitHub Pages"
git push
```

