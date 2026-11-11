import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it } from "vitest";
import { ChangeDetailPage } from "../src/pages/ChangeDetailPage";
import { ChangesPage } from "../src/pages/ChangesPage";
import { sampleChanges } from "./fixtures/empty-data";

it("filters the radar by system and keeps review status visible", () => {
  render(
    <MemoryRouter>
      <ChangesPage changes={sampleChanges} />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText("体系"), {
    target: { value: "ECE" },
  });
  expect(screen.getByText("UN R17 头枕要求更新观察")).toBeInTheDocument();
  expect(
    screen.queryByText("座椅强度试验编辑性更新观察"),
  ).not.toBeInTheDocument();
  expect(screen.getAllByText("待审核").length).toBeGreaterThan(0);
});

it("links approved change cards to the completed report", () => {
  const approvedChange = {
    ...sampleChanges[0],
    id: "change-approved-report",
    title: "Approved change report",
    reviewStatus: "approved" as const,
    reportPath: "reports/approved-report.html",
  };

  render(
    <MemoryRouter>
      <ChangesPage changes={[approvedChange]} />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("link", { name: "Approved change report" }),
  ).toHaveAttribute("href", "/reports/approved-report.html");
});

it("links draft change cards to their report when one is available", () => {
  const draftChange = {
    ...sampleChanges[0],
    id: "change-draft-report",
    title: "Draft change report",
    reviewStatus: "draft" as const,
    reportPath: "reports/draft-report.html",
  };

  render(
    <MemoryRouter>
      <ChangesPage changes={[draftChange]} />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("link", { name: "Draft change report" }),
  ).toHaveAttribute("href", "/reports/draft-report.html");
  expect(
    screen.getByRole("link", { name: /查看审核稿/ }),
  ).toHaveAttribute("href", "/reports/draft-report.html");
});

it("renders the full report document on a change detail route", () => {
  const reportChange = {
    ...sampleChanges[0],
    id: "change-report-detail",
    title: "Report detail",
    reportPath: "reports/report-detail.html",
  };

  const { container } = render(
    <MemoryRouter initialEntries={[`/changes/${reportChange.id}`]}>
      <Routes>
        <Route
          path="/changes/:id"
          element={<ChangeDetailPage changes={[reportChange]} />}
        />
      </Routes>
    </MemoryRouter>,
  );

  const frame = container.querySelector("iframe.report-document-frame");
  expect(frame).toHaveAttribute("src", "/reports/report-detail.html");
});
