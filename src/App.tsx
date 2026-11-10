import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { AboutPage } from "./pages/AboutPage";
import { AdminPage } from "./pages/AdminPage";
import { ChangeDetailPage } from "./pages/ChangeDetailPage";
import { ChangesPage } from "./pages/ChangesPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ReportsPage } from "./pages/ReportsPage";
import { StandardDetailPage } from "./pages/StandardDetailPage";
import { StandardsPage } from "./pages/StandardsPage";
import changesJson from "./data/changes.json";
import importReportJson from "./data/import-report.json";
import metaJson from "./data/meta.json";
import reportsJson from "./data/reports.json";
import sourcesJson from "./data/sources.json";
import standardsJson from "./data/standards.json";
import knowledgeJson from "./data/knowledge.json";
import newsfeedJson from "./data/newsfeed.json";
import type {
  ImportReport,
  MonitorMeta,
  RegulationChange,
  ReportRecord,
  SourceRecord,
  StandardRecord,
  KnowledgeItem,
  NewsFeedItem,
} from "./types";

const standards = standardsJson as StandardRecord[];
const sources = sourcesJson as SourceRecord[];
const changes = changesJson as RegulationChange[];
const reports = reportsJson as ReportRecord[];
const importReport = importReportJson as ImportReport;
const meta = metaJson as MonitorMeta;
const knowledge = knowledgeJson as KnowledgeItem[];
const newsfeed = newsfeedJson as NewsFeedItem[];

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
              knowledge={knowledge}
              newsfeed={newsfeed}
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
        <Route
          path="/admin"
          element={
            <AdminPage
              standards={standards}
              sources={sources}
              knowledge={knowledge}
              newsfeed={newsfeed}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
