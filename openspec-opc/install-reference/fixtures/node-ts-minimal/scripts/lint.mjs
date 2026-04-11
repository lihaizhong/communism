import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, "package.json"), "utf8"));
const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "index.ts"), "utf8");

assert.equal(packageJson.type, "module");
assert.ok(packageJson.exports?.["."], "library fixture should expose a package entrypoint");
assert.match(source, /helloFixture/);
assert.doesNotMatch(source, /TODO|TBD|placeholder/i);

console.log("node-ts-minimal fixture lint passed");
