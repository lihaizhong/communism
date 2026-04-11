import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "main.ts"), "utf8");

assert.ok(packageJson.dependencies?.react, "app fixture should carry a frontend framework marker");
assert.ok(packageJson.scripts?.dev, "app fixture should expose a dev script");
assert.match(source, /createAppShell/);
assert.doesNotMatch(source, /TODO|TBD|placeholder/i);

console.log("node-ts-app fixture lint passed");
