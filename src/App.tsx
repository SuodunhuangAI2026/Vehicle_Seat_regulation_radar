import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { AboutPage } from "./pages/AboutPage";
import { ChangeDetailPage } from "./pages/ChangeDetailPage";
import { ChangesPage } from "./pages/ChangesPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SourcesPage } from "./pages/SourcesPage";
import { StandardDetailPage } from "./pages/StandardDetailPage";
import { StandardsPage } from "./pages/StandardsPage";
import changesJson from "./data/changes.json";
import importReportJson from "./data/import-report.json";
import metaJson from "./data/meta.json";
import reportsJson from "./data/reports.json";
import sourcesJson from "./data/sources.json";
import standardsJson from "./data/standards.json";
import type {
  ImportReport,
  MonitorMeta,
  RegulationChange,
  ReportRecord,
  SourceRecord,
  StandardRecord,
} from "./types";

const standards = standardsJson as StandardRecord[];
const sources = sourcesJson as SourceRecord[];
const changes = changesJson as RegulationChange[];
const reports = reportsJson as ReportRecord[];
const importReport = importReportJson as ImportReport;
const meta = metaJson as MonitorMeta;

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

export function App() {
  return (
    <AppShell>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <OverviewPage
              standards={standards}
              sources={sources}
              changes={changes}
              reports={reports}
              importReport={importReport}
              meta={meta}
            />
          }
        />
        <Route
          path="/changes"
          element={<ChangesPage changes={changes} />}
        />
        <Route
          path="/changes/:id"
          element={<ChangeDetailPage changes={changes} />}
        />
        <Route
          path="/standards"
          element={
            <StandardsPage
              standards={standards}
              importReport={importReport}
            />
          }
        />
        <Route
          path="/standards/:id"
          element={
            <StandardDetailPage standards={standards} changes={changes} />
          }
        />
        <Route
          path="/sources"
          element={
            <SourcesPage
              sources={sources}
              health={meta.sourceHealth}
              importReport={importReport}
            />
          }
        />
        <Route
          path="/reports"
          element={<ReportsPage reports={reports} changes={changes} />}
        />
        <Route
          path="/about"
          element={
            <AboutPage
              importReport={importReport}
              meta={meta}
              sources={sources}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
