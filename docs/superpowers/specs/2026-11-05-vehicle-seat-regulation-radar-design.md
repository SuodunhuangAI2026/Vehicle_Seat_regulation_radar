# SeatScope · M1 座椅法规雷达 · 锁老师

- Status: Approved design, ready for implementation planning
- Date: 2026-11-05
- Repository: `SuodunhuangAI2026/Vehicle_Seat_regulation_radar`
- Public URL: `https://SuodunhuangAI2026.github.io/Vehicle_Seat_regulation_radar/`

## 1. Purpose

Build a public, static regulation-intelligence site for M1 vehicle seat standards.
The site monitors official standards sources, detects document and version changes,
uses DeepSeek to prepare a Chinese impact analysis, and publishes a reviewable HTML
report. The reviewer sends approved reports to Feishu manually.

Success means a reviewer can:

1. See which standards are monitored and when they were last checked.
2. Identify new, amended, corrected, replaced, repealed, or draft standards.
3. Open a structured comparison of requirements, test methods, dates, and impact.
4. Download or open the generated HTML report.
5. Copy a concise Feishu-ready summary after human review.

## 2. Constraints

- Hosting is GitHub Pages only. No server, database, queue, or persistent API process.
- Scheduled work runs in GitHub Actions.
- DeepSeek is the only model provider required for the first release.
- Feishu delivery is manual. The product must not send messages automatically.
- The API key is provided through GitHub Actions Secrets and local environment
  variables. It must never be committed.
- Public pages must remain useful when no AI key is configured or when a source
  fails.
- Regulatory conclusions must be traceable to a standard number, version, source
  URL, and a review status.

## 3. Inputs

### 3.1 Standards workbook

`JF AI 非企业标准清单_20261105.xlsx`

Parsed facts:

- Two data sheets: document-level records and standard-number summaries.
- Document sheet contains 141 data rows plus one header row.
- Standard-number summary contains 107 data rows plus one header row.
- The workbook statistics sheet reports 155 documents and 111 deduplicated
  identifiers. This differs from the visible document rows. The site must preserve
  both the reported aggregate and the actual imported row count and must not hide
  the discrepancy.
- Covered systems include FMVSS, CMVSS, UNECE ECE, UN Regulations, UN GTR, GB,
  GB/T, ADR, C-IASI, C-NCAP, GSO, ISO, QC/T, Euro NCAP, JNCAP, KNCAP, ANCAP,
  ASEAN NCAP, Latin NCAP, IIHS, and related industry protocols.

### 3.2 Source workbook

`Edge收藏夹_法规与标准网址清单.docx`

Parsed facts:

- Eleven source categories covering UNECE, European Union, China, United States,
  Canada, Australia, Asia-Pacific markets, global guidance, NCAP programmes,
  ISO/SAE/VDA/JIS, and certification organizations.
- 92 unique external URLs are present in the document relationships.
- Section labels state larger target counts than the number of links physically
  present in several sections. The source center must use the 92 actual links and
  show a data-quality note rather than invent missing entries.

### 3.3 Architecture reference

The AIHOT open-source project is an information-architecture and interaction
reference only. Do not reuse its name, logo, visual identity, source data, or
operating content.

## 4. Product Structure

The application is a single-page React app using hash-based routes. Standalone
HTML reports are separate files under the deployed public directory.

### 4.1 Overview

Route: `#/`

- Hero with product name, current monitoring status, and last refresh time.
- Metric cards: standards in library, source count, new changes this cycle,
  reports awaiting review, high-impact changes.
- Change radar preview ordered by severity and detection date.
- Upcoming dates panel for publication, comment, approval, effective, transition,
  and repeal dates when known.
- Source health panel showing success, unchanged, changed, unsupported, and failed.
- Latest report card with open, download, and copy-summary actions.

### 4.2 Change radar

Route: `#/changes`

- Filters: system, issuer, change type, severity, review status, date range.
- Search by standard number, title, summary, or affected design/test area.
- Change cards show old version, new version, detected date, impact label, evidence
  count, and review state.
- Detail view: `#/changes/:id`.

Change types:

- `new`
- `revision`
- `amendment`
- `corrigendum`
- `supplement`
- `replacement`
- `repeal`
- `translation-only`
- `status-change`
- `draft`
- `unknown`

Severity:

- `critical`: immediate design, tooling, certification, or production impact.
- `high`: material requirement or test-method change with a near-term deadline.
- `medium`: meaningful change requiring engineering assessment.
- `low`: editorial, translation, or administrative change.
- `unassessed`: insufficient evidence for human triage.

### 4.3 Standards library

Route: `#/standards`

- Search and filter by system, issuer, version, document kind, and monitored state.
- Group documents by standard number.
- Each record shows standard number, title, version, issuer, source system, source
  file name, stored source URL when available, and current library status.
- Detail view: `#/standards/:id`.
- A data-quality banner links to the import report and explains discrepancies
  between workbook statistics and physical rows.

### 4.4 Source center

Route: `#/sources`

- Group sources by the categories in the source workbook.
- Show name, URL, category, original bookmark location, adapter status, last check,
  last successful check, and latest error.
- Mark source monitoring mode:
  - `automated`: an implemented adapter fetches and diffs it.
  - `catalogued`: the URL is stored but monitored manually in the first release.
  - `unsupported`: the source blocks automated fetching or requires login.
- Manual "open source" action always uses the official URL.

### 4.5 Reports

Route: `#/reports`

- Archive of generated HTML reports.
- Filters by date, system, severity, and review status.
- Report card: title, generated time, affected standards, impact, and review state.
- Review state values: `draft`, `approved`, `rejected`, `superseded`.
- Opening a report uses a normal static HTML file and works without the React app.

### 4.6 Method and disclaimer

Route: `#/about`

- Explain the collection, comparison, AI-assistance, review, and manual Feishu flow.
- State that AI output is not a legal or certification conclusion.
- Show model name, prompt version, last successful run, and known monitoring gaps.
- Document that dates and impacts marked `unknown` require manual verification.

## 5. Visual Direction

The interface should feel like an industrial regulatory control room, not a generic
SaaS dashboard.

### 5.1 Brand

- Product name: `SeatScope · M1 座椅法规雷达 · 锁老师`
- Short label: `SeatScope`
- Reviewer label: `锁老师`
- Logo mark: radar sweep crossing a stylized seat cross-section.
- Tone: precise, editorial, calm, and auditable.

### 5.2 Palette

- Paper: `#F3F0E8`
- Ink: `#13232D`
- Navy: `#173D54`
- Steel: `#56717C`
- Safety orange: `#E65A2E`
- Signal green: `#2F725F`
- Alert red: `#B33A2B`
- Amber: `#C68A2B`

### 5.3 Typography

- Display: `Source Han Serif SC`, `Noto Serif SC`, `Songti SC`, serif.
- Interface: `IBM Plex Sans`, `PingFang SC`, `Microsoft YaHei`, sans-serif.
- Numbers and standard IDs use tabular numerals.
- Avoid Inter, Roboto, Arial, and default monochrome dashboard styling.

### 5.4 Layout and motion

- Desktop: editorial two-column hero, dense but readable tables, sticky filters.
- Mobile: single-column cards, horizontal filter chips, collapsible details.
- Background uses a subtle technical grid and radar contour, not a flat fill.
- Motion is limited to initial stagger reveals, live-status pulse, and report
  transitions. Respect `prefers-reduced-motion`.
- Accessibility target: WCAG AA contrast, keyboard-operable filters and dialogs,
  visible focus, semantic landmarks, and meaningful link text.

## 6. Data Architecture

All runtime data is static and committed under `src/data`.

### 6.1 `standards.json`

```ts
type StandardRecord = {
  id: string;
  standardNo: string;
  title: string;
  version: string;
  issuer: string;
  system: string;
  documentKind: string;
  sourceFileName: string;
  sourceUrl?: string;
  status: "active" | "draft" | "superseded" | "unknown";
  monitored: boolean;
  importedAt: string;
};
```

### 6.2 `sources.json`

```ts
type SourceRecord = {
  id: string;
  name: string;
  url: string;
  category: string;
  bookmarkLocation?: string;
  monitoringMode: "automated" | "catalogued" | "unsupported";
  adapterId?: string;
};
```

### 6.3 `changes.json`

```ts
type RegulationChange = {
  id: string;
  standardIds: string[];
  standardNumbers: string[];
  title: string;
  system: string;
  issuer: string;
  changeType: string;
  severity: "critical" | "high" | "medium" | "low" | "unassessed";
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
  evidence: Array<{
    label: string;
    url: string;
    quote?: string;
  }>;
  confidence: "high" | "medium" | "low";
  reviewStatus: "draft" | "approved" | "rejected" | "superseded";
  reportPath?: string;
  model: string;
  promptVersion: string;
};
```

### 6.4 `meta.json`

Contains:

- Last successful run.
- Last attempted run.
- Source success and failure counts.
- Imported document-row count and workbook-reported count.
- Source-link count and source-document-reported count.
- Current prompt version and model.
- Repository URL and deployment URL.

### 6.5 Snapshot state

`monitor/state/snapshots.json` stores only operational state:

- Source ID.
- URL.
- Content SHA-256.
- ETag and Last-Modified when supplied.
- Last checked timestamp.
- Last successful timestamp.
- Short title list or normalized excerpt hash.

Full source content is not committed. Temporary content exists only inside the
GitHub Actions workspace.

## 7. Monitoring Pipeline

Entry point: `npm run monitor`

Stages:

1. Load source configuration and adapters.
2. Fetch each enabled source with timeout, user agent, conditional request headers,
   and rate limiting.
3. Normalize fetched content into a source snapshot.
4. Compare hashes and stable item keys with the previous snapshot.
5. If unchanged, update check metadata and exit the source path.
6. If changed, extract candidate updates and evidence.
7. Optionally fetch directly linked public PDFs and extract readable text.
8. Send bounded evidence to DeepSeek and request strict JSON.
9. Validate the response with Zod. Reject malformed or unsupported output.
10. Merge the validated change into `changes.json` without overwriting human review
    status.
11. Render a standalone HTML report from the validated record.
12. Update source health and run metadata.
13. Write files, run tests, build, and let the workflow deploy GitHub Pages.

Failure behavior:

- A failed source never stops other sources.
- A failed DeepSeek call leaves the source marked changed and creates an
  `unassessed` change requiring manual review.
- A failed PDF extraction records `extractionStatus: failed` and keeps the source
  link.
- Repeated failures are shown in source health and the run summary.
- The pipeline exits non-zero only for repository-level failures such as invalid
  configuration or failing tests.

## 8. Initial Source Adapters

The first release implements a small, testable set of real adapters:

1. eCFR structured API for selected 49 CFR Part 571 sections.
2. UNECE WP.29 / UN Regulations HTML listing.
3. NHTSA FMVSS page.
4. Transport Canada Motor Vehicle Safety Regulations change page.

All remaining source links are catalogued and visible, marked non-automated until a
dedicated adapter is validated. Adapters use fixtures in tests and never depend on
live network availability during the standard test suite.

## 9. DeepSeek Contract

Environment:

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL` default `https://api.deepseek.com`
- `DEEPSEEK_MODEL` default `deepseek-chat`

Request behavior:

- Use JSON output mode.
- Limit evidence size and include source labels.
- Instruct the model to return only the required schema.
- Explicitly prohibit invented dates, standard clauses, test methods, and legal
  conclusions.
- Require `unknown` or omission when evidence is insufficient.
- Record prompt version with every change record.

Validated response fields:

- Materiality.
- Change type.
- Chinese title and summary.
- Old and new version.
- Publication, comment, approval, effective, transition, and repeal dates.
- Affected design areas.
- Affected test methods.
- Recommended actions.
- Evidence references.
- Confidence.
- Human-review requirement.

## 10. HTML Report

The report is self-contained, printable, and safe to open without JavaScript.

Sections:

1. Header: SeatScope brand, report ID, generated time, review status.
2. Executive conclusion.
3. Standard identity and version transition.
4. Change classification and severity.
5. Regulatory timeline.
6. Requirement and test-method comparison.
7. M1 seat design and validation impact.
8. Recommended actions and owners.
9. Evidence and official links.
10. Confidence, unknowns, and review checklist.
11. Feishu-ready summary block.

Safety:

- Generate HTML from typed data with escaped strings.
- Never insert raw model HTML.
- Use inline CSS and local assets only.
- Provide print styles.
- Add a visible "待人工复核" watermark until review state is `approved`.

## 11. Review Workflow

- Actions creates a report in `draft`.
- The public site surfaces it under "待审核".
- The reviewer opens the HTML report, checks evidence, and decides.
- Approval metadata is changed through a small `npm run review -- <report-id> --approve`
  command committed by the reviewer or through a documented manual JSON edit.
- The site exposes a "复制飞书摘要" action only after approval.
- The reviewer pastes the summary into Feishu manually.
- No automatic Feishu webhook is implemented in this release.

## 12. GitHub Pages and Actions

### 12.1 Build

- Vite production build.
- Base path derived from `GITHUB_REPOSITORY` in Actions, with a local fallback of
  `/`.
- Static deployment artifact from `dist/`.

### 12.2 Workflow

File: `.github/workflows/monitor-and-deploy.yml`

Triggers:

- `schedule` at `0 0 * * *` UTC, equal to 08:00 Asia/Shanghai.
- `workflow_dispatch`.
- `push` to `main`.

Permissions:

- `contents: write`
- `pages: write`
- `id-token: write`

Jobs:

1. Checkout.
2. Install Node 24 and dependencies.
3. Run tests.
4. Run monitor with `DEEPSEEK_API_KEY`.
5. Commit generated data and reports when changed.
6. Build.
7. Upload Pages artifact.
8. Deploy Pages.

The workflow must avoid recursive deployments and keep scheduled runs running if
the model key is absent, producing a source-health update only.

## 13. Security and Privacy

- Secrets only through local `.env.local` and GitHub Actions Secrets.
- `.env*` excluded except `.env.example`.
- External links use `rel="noreferrer noopener"`.
- Reports escape all model and source text.
- No private company documents or non-public standards are copied into the public
  repository.
- The public repository contains only the supplied source catalog, public standard
  metadata, source URLs, and generated summaries.
- Any report containing sensitive internal notes must remain local and must not be
  committed.

## 14. Testing

Unit tests:

- Workbook and source-document normalization.
- Standard IDs and grouping.
- Source URL deduplication and category mapping.
- Snapshot diff behavior.
- DeepSeek response validation and rejection paths.
- Review-state merge preserves human decisions.
- HTML escaping.

Component tests:

- Filters and search.
- Empty and failure states.
- Review report links.
- Mobile navigation.

End-to-end verification:

- Local production build.
- Desktop and mobile screenshots via the available browser tooling.
- Keyboard navigation and focus states.
- Standalone report opens from a direct URL.
- GitHub Pages asset paths resolve under the repository base path.

## 15. Acceptance Criteria

1. The site displays the approved name and reviewer label.
2. The standards library imports the visible workbook rows and preserves the
   reported-count discrepancy.
3. The source center displays all 92 extracted unique URLs with category and mode.
4. The dashboard, changes, standards, sources, reports, and about routes work on
   desktop and mobile.
5. A fixture-driven monitor run detects a change, validates DeepSeek-shaped output,
   and generates a standalone HTML report.
6. A live scheduled run can update source state without a browser or database.
7. Tests and production build pass.
8. The repository deploys to GitHub Pages at the target URL.
9. Review remains human-controlled and Feishu delivery remains manual.

## 16. Non-Goals

- Rebuilding the complete AIHOT backend.
- Logging in, role management, or a server-side admin console.
- Automatically sending Feishu messages.
- Guaranteeing complete clause-level comparison for anti-bot or login-protected
  sources.
- Presenting AI output as legal, certification, or release approval.
- Monitoring all 92 sources automatically in the first release.

## 17. Known Risks

- Official sources can change HTML structure or block Actions IP ranges.
- PDF text extraction may fail for scanned or protected files.
- DeepSeek may infer unsupported impacts; validation and human review are required.
- GitHub Pages has no server-side secret and no runtime API; all AI work must occur
  in Actions.
- A public repository must not contain internal-only standards or confidential
  company data.

