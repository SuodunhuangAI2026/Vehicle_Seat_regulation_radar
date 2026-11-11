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
  expect(screen.getByText(/监控数据已载入/)).toBeInTheDocument();
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

  expect(container.querySelectorAll(".hero-carousel")).toHaveLength(1);
  expect(container.querySelectorAll(".hero-carousel-dots button")).toHaveLength(
    5,
  );
  const heading =
    container.querySelector(".hero-carousel-title h1")?.textContent ?? "";
  expect(/^变化报告 [1-5]$/.test(heading)).toBe(true);
});

it("shows the report with the newest generatedAt in the review desk", () => {
  const olderReport = {
    ...sampleReport,
    id: "report-older",
    title: "旧审核稿",
    generatedAt: "2026-11-10T00:00:00.000Z",
  };
  const newestReport = {
    ...sampleReport,
    id: "report-gb-15083",
    title: "GB 15083 最新审核稿",
    generatedAt: "2026-11-11T00:00:00.000Z",
  };

  render(
    <MemoryRouter>
      <OverviewPage
        standards={sampleStandards}
        sources={sampleSources}
        changes={sampleChanges}
        reports={[olderReport, newestReport]}
        importReport={sampleImportReport}
        meta={sampleMeta}
        knowledge={[]}
        newsfeed={[]}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText("GB 15083 最新审核稿")).toBeInTheDocument();
  expect(screen.queryByText("旧审核稿")).not.toBeInTheDocument();
});
