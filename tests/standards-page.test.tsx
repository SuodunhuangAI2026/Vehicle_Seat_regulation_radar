import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import { StandardsPage } from "../src/pages/StandardsPage";
import { sampleStandards } from "./fixtures/empty-data";

afterEach(cleanup);

it("filters standards by system without public data-quality notices", () => {
  render(
    <MemoryRouter>
      <StandardsPage standards={sampleStandards} />
    </MemoryRouter>,
  );

  expect(screen.getByText("标准库")).toBeInTheDocument();
  expect(screen.queryByText(/数据口径/)).toBeNull();
  fireEvent.change(screen.getByLabelText("体系"), {
    target: { value: "ECE" },
  });
  expect(screen.getByText("座椅、座椅固定装置及头枕")).toBeInTheDocument();
  expect(
    screen.queryByText("汽车座椅、座椅固定装置及头枕强度要求和试验方法"),
  ).not.toBeInTheDocument();
});

it("uses the correct status label for superseded records", () => {
  render(
    <MemoryRouter>
      <StandardsPage
        standards={[
          {
            ...sampleStandards[0],
            id: "std-r17-old",
            status: "superseded",
          },
        ]}
      />
    </MemoryRouter>,
  );

  const row = screen.getByText("UN R17").closest("article");
  expect(row).not.toBeNull();
  expect(within(row!).getByText("已替代")).toBeInTheDocument();
  expect(within(row!).queryByText("征求意见")).not.toBeInTheDocument();
});
