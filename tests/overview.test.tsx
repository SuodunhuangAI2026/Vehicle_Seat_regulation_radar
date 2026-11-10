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
        knowledge={[]}
        newsfeed={[]}
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

it("shows one active change headline and clickable dots for up to five items", () => {
  const changes = Array.from({ length: 5 }, (_, index) => ({
    ...sampleChanges[0],
    id: `change-${index}`,
    title: `变化报告 ${index + 1}`,
    detectedAt: `2026-11-0${index + 1}T00:00:00.000Z`,
  }));
  const { container } = render(
    <MemoryRouter>
      <OverviewPage
        standards={sampleStandards}
        sources={sampleSources}
        changes={changes}
        reports={[]}
        importReport={sampleImportReport}
        meta={sampleMeta}
        knowledge={[]}
        newsfeed={[]}
      />
    </MemoryRouter>,
  );

  expect(container.querySelectorAll(".news-carousel")).toHaveLength(1);
  expect(container.querySelectorAll(".news-dots button")).toHaveLength(5);
  const heading = container.querySelector(".news-carousel h2")?.textContent ?? "";
  expect(/^变化报告 [1-5]$/.test(heading)).toBe(true);
});
