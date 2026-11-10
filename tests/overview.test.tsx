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

it("duplicates the five-item change ticker for a seamless loop", () => {
  const changes = Array.from({ length: 6 }, (_, index) => ({
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

  const copies = container.querySelectorAll(".news-ticker-copy");
  expect(copies).toHaveLength(2);
  expect(copies[0].querySelectorAll(".news-ticker-item")).toHaveLength(10);
  expect(copies[0].querySelectorAll("a:not([aria-hidden])")).toHaveLength(5);
  expect(copies[1].getAttribute("aria-hidden")).toBe("true");
  expect(copies[1].querySelectorAll('a[tabindex="-1"]')).toHaveLength(10);
  expect(
    [...copies[0].querySelectorAll(".news-ticker-title")].some(
      (item) => item.textContent === "变化报告 1",
    ),
  ).toBe(false);
});
