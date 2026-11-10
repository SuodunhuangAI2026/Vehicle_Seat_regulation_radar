import { expect, it } from "vitest";
import {
  filterChanges,
  filterStandards,
  groupStandards,
  normalizeStandardKey,
  standardFamilyKey,
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

it("groups base standard numbers while keeping appendix identifiers separate", () => {
  expect(standardFamilyKey("GB 15083-2019")).toBe("gb15083");
  expect(standardFamilyKey("GB 15083-202X（征求意见稿）")).toBe("gb15083");
  expect(standardFamilyKey("GB 7258")).toBe("gb7258");
  expect(standardFamilyKey("GB 7258-2017")).toBe("gb7258");
  expect(standardFamilyKey("C-NCAP 2027 附录A")).not.toBe(
    standardFamilyKey("C-NCAP 2027 附录B"),
  );

  const groups = groupStandards([
    {
      ...sampleStandards[0],
      id: "gb15083-2019",
      standardNo: "GB 15083-2019",
      version: "2019",
      status: "active",
    },
    {
      ...sampleStandards[0],
      id: "gb15083-draft",
      standardNo: "GB 15083-202X（征求意见稿）",
      version: "202X 征求意见稿",
      status: "draft",
    },
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].records).toHaveLength(2);
});
