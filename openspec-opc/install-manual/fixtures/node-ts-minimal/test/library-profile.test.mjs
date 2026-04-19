import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");

test("library fixture keeps the hello export entrypoint", () => {
  const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "index.ts"), "utf8");
  assert.match(source, /export function helloFixture/);
  assert.match(source, /node-ts-minimal/);
});

test("library fixture package metadata stays library-shaped", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
  assert.ok(packageJson.exports?.["."], "expected library export map");
  assert.equal(typeof packageJson.scripts.typecheck, "string");
});
