import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminGate } from "../src/components/AdminGate";
import { AdminPage } from "../src/pages/AdminPage";
import { sampleSources, sampleStandards } from "./fixtures/empty-data";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderProtectedAdmin() {
  render(
    <MemoryRouter>
      <AdminGate>
        <AdminPage
          standards={sampleStandards}
          sources={sampleSources}
          knowledge={[]}
          newsfeed={[]}
        />
      </AdminGate>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

it("keeps the admin console hidden until a repository writer is verified", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({ login: "SuodunhuangAI2026" }))
    .mockResolvedValueOnce(
      jsonResponse({
        full_name: "SuodunhuangAI2026/Vehicle_Seat_regulation_radar",
        permissions: { push: true },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);

  renderProtectedAdmin();

  expect(
    await screen.findByRole("heading", { name: "管理员验证" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "轻量 JSON 管理台" })).toBeNull();

  fireEvent.change(screen.getByLabelText("GitHub Personal Access Token"), {
    target: { value: "github_pat_test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "验证并进入" }));

  expect(
    await screen.findByRole("heading", { name: "轻量 JSON 管理台" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(window.sessionStorage.getItem("seatscope.admin.github-session")).toContain(
    '"login":"SuodunhuangAI2026"',
  );
});

it("rejects a GitHub account without repository write permission", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ login: "visitor" }))
      .mockResolvedValueOnce(
        jsonResponse({
          full_name: "SuodunhuangAI2026/Vehicle_Seat_regulation_radar",
          permissions: { push: false },
        }),
      ),
  );

  renderProtectedAdmin();

  await screen.findByRole("heading", { name: "管理员验证" });
  fireEvent.change(screen.getByLabelText("GitHub Personal Access Token"), {
    target: { value: "github_pat_readonly" },
  });
  fireEvent.click(screen.getByRole("button", { name: "验证并进入" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "没有本仓库的写入权限",
  );
  expect(screen.queryByRole("heading", { name: "轻量 JSON 管理台" })).toBeNull();
});
