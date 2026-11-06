import { expect, it } from "vitest";
import {
  filterChanges,
  filterStandards,
  normalizeStandardKey,
} from "../src/lib/filters";
import {
  sampleChanges,
  sampleStandards,
} from "./fixtures/empty-data";

it("searches standard number, Chinese summary, and test method", () => {
  const result = filterChanges(sampleChanges, { query: "头枕冲击试验" });
  expect(result.map((change) => change.id)).toEqual(["change-headrest"]);
});

it("combines severity and review status without dropping matching rows", () => {
  const result = filterChanges(sampleChanges, {
    severity: "high",
    reviewStatus: "draft",
  });
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe("change-headrest");
});

it("normalizes full-width punctuation and whitespace for standard search", () => {
  expect(normalizeStandardKey("UN－R 17")).toBe("unr17");
  const result = filterStandards(sampleStandards, { query: "UN R17" });
  expect(result.map((standard) => standard.id)).toEqual(["std-r17"]);
});
