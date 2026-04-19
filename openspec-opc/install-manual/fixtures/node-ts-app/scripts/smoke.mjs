import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(ROOT, "..");
const html = fs.readFileSync(path.join(FIXTURE_ROOT, "index.html"), "utf8");
const source = fs.readFileSync(path.join(FIXTURE_ROOT, "src", "main.ts"), "utf8");

assert.match(html, /id="app-root"/);
assert.match(html, /node-ts-app/);
assert.match(source, /createAppShell/);

console.log("node-ts-app fixture smoke passed");
