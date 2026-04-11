import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, "preview-demo.mjs");

test("preview demo replays all profile result cards by default", () => {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /OpenSpec OPC Zero-Install Preview/);
  assert.match(result.stdout, /Node\/TS Library Preview/);
  assert.match(result.stdout, /Node\/TS App Preview/);
  assert.match(result.stdout, /Node\/TS Service Preview/);
});

test("preview demo supports selecting a single profile", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--profile", "app"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Selected profiles: app/);
  assert.match(result.stdout, /node-ts\/app/);
  assert.doesNotMatch(result.stdout, /Node\/TS Library Preview/);
});

test("preview demo rejects unknown profiles", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--profile", "unknown"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown profile/);
});
