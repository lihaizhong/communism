import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");

test("app fixture source exposes the frontend entrypoint symbol", () => {
  const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "main.ts"), "utf8");
  assert.match(source, /export function createAppShell/);
  assert.match(source, /node-ts-app/);
});

test("app fixture package metadata stays app-shaped", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
  assert.ok(packageJson.dependencies?.react);
  assert.ok(packageJson.devDependencies?.vite);
  assert.equal(typeof packageJson.scripts.dev, "string");
});
