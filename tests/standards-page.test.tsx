import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { StandardsPage } from "../src/pages/StandardsPage";
import {
  sampleImportReport,
  sampleStandards,
} from "./fixtures/empty-data";

it("filters standards by system and preserves the count disclosure", () => {
  render(
    <MemoryRouter>
      <StandardsPage
        standards={sampleStandards}
        importReport={sampleImportReport}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText(/155/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("体系"), {
    target: { value: "ECE" },
  });
  expect(screen.getByText("座椅、座椅固定装置及头枕")).toBeInTheDocument();
  expect(
    screen.queryByText("汽车座椅、座椅固定装置及头枕强度要求和试验方法"),
  ).not.toBeInTheDocument();
});
