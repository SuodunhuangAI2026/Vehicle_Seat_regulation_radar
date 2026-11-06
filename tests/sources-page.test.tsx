import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { SourcesPage } from "../src/pages/SourcesPage";
import {
  sampleHealth,
  sampleImportReport,
  sampleSources,
} from "./fixtures/empty-data";

it("distinguishes automated and catalogued sources and discloses the count gap", () => {
  render(
    <MemoryRouter>
      <SourcesPage
        sources={sampleSources}
        health={sampleHealth}
        importReport={sampleImportReport}
      />
    </MemoryRouter>,
  );

  expect(
    screen.getAllByText("UNECE / WP.29 全球统一法规").length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText("自动监控").length).toBeGreaterThan(0);
  expect(screen.getAllByText("人工浏览").length).toBeGreaterThan(0);
  expect(screen.getByText(/缺失项未被虚构补齐/)).toBeInTheDocument();
});
