import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { AdminPage } from "../src/pages/AdminPage";
import {
  sampleSources,
  sampleStandards,
} from "./fixtures/empty-data";

it("switches lightweight JSON datasets and validates edits", () => {
  render(
    <MemoryRouter>
      <AdminPage
        standards={sampleStandards}
        sources={sampleSources}
        knowledge={[
          {
            id: "knowledge-1",
            title: "头枕高度",
            body: "示例知识。",
            updatedAt: "2026-11-09T00:00:00.000Z",
          },
        ]}
        newsfeed={[]}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText("轻量 JSON 管理台")).toBeInTheDocument();
  expect(screen.getByLabelText("法规小知识 JSON")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /标准库/ }));
  expect(screen.getByLabelText("标准库 JSON")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "校验 JSON" }));
  expect(screen.getByText(/校验通过/)).toBeInTheDocument();
});
