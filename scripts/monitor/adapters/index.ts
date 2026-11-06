import { ecfrAdapter } from "./ecfr.js";
import { nhtsaAdapter } from "./nhtsa.js";
import { transportCanadaAdapter } from "./transport-canada.js";
import { uneceAdapter } from "./unece.js";

export const sourceAdapters = [
  ecfrAdapter,
  uneceAdapter,
  nhtsaAdapter,
  transportCanadaAdapter,
];
