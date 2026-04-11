import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");

test("service fixture source exposes the health helper", () => {
  const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "server.ts"), "utf8");
  assert.match(source, /export function createHealthStatus/);
  assert.match(source, /return "ok"/);
});

test("service fixture package metadata stays service-shaped", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
  assert.ok(packageJson.dependencies?.express);
  assert.equal(typeof packageJson.scripts.start, "string");
});
