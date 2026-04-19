import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "server.ts"), "utf8");

assert.ok(packageJson.dependencies?.express, "service fixture should carry a service runtime marker");
assert.ok(packageJson.scripts?.start, "service fixture should expose a start script");
assert.match(source, /createHealthStatus/);
assert.doesNotMatch(source, /TODO|TBD|placeholder/i);

console.log("node-ts-service fixture lint passed");
