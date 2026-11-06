import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { App } from "../src/App";

it("shows the approved product identity and primary routes", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );

  expect(
    screen.getByText("SeatScope · M1 座椅法规雷达 · 锁老师"),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "变更雷达" })).toHaveAttribute(
    "href",
    "/changes",
  );
  expect(screen.getByRole("link", { name: "标准库" })).toBeInTheDocument();
  expect(
    screen.getAllByRole("link", { name: "信源中心" }).length,
  ).toBeGreaterThan(0);
});
