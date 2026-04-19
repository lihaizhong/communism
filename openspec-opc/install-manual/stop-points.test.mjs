import test from "node:test";
import assert from "node:assert/strict";

import { createQualityStackStopPoint, renderStopPoint } from "./stop-points.mjs";

test("stop-point rendering keeps recommended custom abort order", () => {
  const output = renderStopPoint(
    createQualityStackStopPoint({
      missingGates: ["lint", "typecheck"],
    }),
  );

  assert.ok(output.indexOf("- recommended:") < output.indexOf("- custom:"));
  assert.ok(output.indexOf("- custom:") < output.indexOf("- abort:"));
});
