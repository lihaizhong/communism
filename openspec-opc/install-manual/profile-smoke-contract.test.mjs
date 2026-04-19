import test from "node:test";
import assert from "node:assert/strict";

import { planNodeTsProfileSmoke, PROFILE_SMOKE_STATUSES } from "./profile-smoke-contract.mjs";

test("app profile smoke contract resolves to a page smoke command", () => {
  const plan = planNodeTsProfileSmoke({
    packageJson: {
      dependencies: {
        react: "^19.0.0",
      },
      devDependencies: {
        vite: "^7.0.0",
      },
      scripts: {
        dev: "vite",
        smoke: "node ./scripts/smoke.mjs",
      },
    },
  });

  assert.ok(PROFILE_SMOKE_STATUSES.includes(plan.status));
  assert.equal(plan.status, "ready");
  assert.equal(plan.profile, "app");
  assert.equal(plan.smokeTest?.id, "app-page-smoke");
  assert.equal(plan.smokeTest?.kind, "page");
  assert.equal(plan.smokeTest?.command, "npm run smoke");
  assert.match(plan.smokeTest?.successCriteria.join(" "), /root marker/);
});

test("service profile smoke contract resolves to an API smoke command", () => {
  const plan = planNodeTsProfileSmoke({
    packageJson: {
      dependencies: {
        express: "^5.0.0",
      },
      scripts: {
        start: "node ./src/server.ts",
        "smoke:service": "node ./scripts/service-smoke.mjs",
      },
    },
  });

  assert.equal(plan.status, "ready");
  assert.equal(plan.profile, "service");
  assert.equal(plan.smokeTest?.id, "service-api-smoke");
  assert.equal(plan.smokeTest?.kind, "api");
  assert.equal(plan.smokeTest?.command, "npm run smoke:service");
  assert.match(plan.smokeTest?.successCriteria.join(" "), /2xx response|success payload/);
});

test("library profile smoke contract is explicitly not applicable", () => {
  const plan = planNodeTsProfileSmoke({
    packageJson: {
      main: "dist/index.js",
      types: "dist/index.d.ts",
      scripts: {
        build: "tsc -p tsconfig.json",
      },
    },
  });

  assert.equal(plan.status, "not_applicable");
  assert.equal(plan.profile, "library");
  assert.equal(plan.smokeTest, null);
});

test("eligible profiles without smoke scripts return missing", () => {
  const appPlan = planNodeTsProfileSmoke({
    packageJson: {
      dependencies: {
        react: "^19.0.0",
      },
      scripts: {
        dev: "vite",
      },
    },
  });
  const servicePlan = planNodeTsProfileSmoke({
    packageJson: {
      dependencies: {
        express: "^5.0.0",
      },
      scripts: {
        start: "node ./src/server.ts",
      },
    },
  });

  assert.equal(appPlan.status, "missing");
  assert.match(appPlan.reasons.join(" "), /smoke scripts/);
  assert.equal(servicePlan.status, "missing");
  assert.match(servicePlan.reasons.join(" "), /smoke scripts/);
});
