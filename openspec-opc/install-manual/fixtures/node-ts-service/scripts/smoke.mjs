import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "server.ts"), "utf8");

assert.ok(packageJson.scripts?.start, "service smoke expects a start command");
assert.match(source, /createHealthStatus/);
assert.match(source, /return "ok"/);

console.log("node-ts-service fixture smoke passed");
