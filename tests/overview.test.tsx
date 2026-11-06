import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { OverviewPage } from "../src/pages/OverviewPage";
import {
  sampleChanges,
  sampleImportReport,
  sampleMeta,
  sampleReport,
  sampleSources,
  sampleStandards,
} from "./fixtures/empty-data";

it("renders metrics, source health, and the latest change", () => {
  render(
    <MemoryRouter>
      <OverviewPage
        standards={sampleStandards}
        sources={sampleSources}
        changes={sampleChanges}
        reports={[sampleReport]}
        importReport={sampleImportReport}
        meta={sampleMeta}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText("标准记录")).toBeInTheDocument();
  expect(screen.getAllByText("待审核").length).toBeGreaterThan(0);
  expect(
    screen.getAllByText("UN R17 头枕要求更新观察").length,
  ).toBeGreaterThan(0);
  expect(screen.getByText("监控数据已载入")).toBeInTheDocument();
});
