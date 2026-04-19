import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const PROFILES = {
  library: {
    title: "Node/TS Library Preview",
    fixture: "node-ts-minimal",
    lane: "node-ts/library",
    description: "最小 first-success 路径，展示文档驱动安装器的默认成功结果卡。",
  },
  app: {
    title: "Node/TS App Preview",
    fixture: "node-ts-app",
    lane: "node-ts/app",
    description: "前端应用路径，包含 lint / test / typecheck + page smoke。",
  },
  service: {
    title: "Node/TS Service Preview",
    fixture: "node-ts-service",
    lane: "node-ts/service",
    description: "服务端路径，包含 lint / test / typecheck + API smoke。",
  },
};

function parseArgs(argv) {
  let requestedProfiles = [];

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--profile") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("missing value for --profile");
      }
      requestedProfiles = [value];
      index += 1;
      continue;
    }
    if (current.startsWith("--profile=")) {
      requestedProfiles = [current.slice("--profile=".length)];
      continue;
    }
    if (current === "--help" || current === "-h") {
      return { help: true, profiles: [] };
    }
    throw new Error(`unknown argument: ${current}`);
  }

  if (requestedProfiles.length === 0) {
    requestedProfiles = ["library", "app", "service"];
  }

  for (const profile of requestedProfiles) {
    if (!PROFILES[profile]) {
      throw new Error(
        `unknown profile: ${profile}. expected one of ${Object.keys(PROFILES).join(", ")}`,
      );
    }
  }

  return { help: false, profiles: requestedProfiles };
}

function helpText() {
  return [
    "OpenSpec OPC Zero-Install Preview",
    "",
    "Usage:",
    "  node ./scripts/preview-demo.mjs",
    "  node ./scripts/preview-demo.mjs --profile app",
    "",
    "Profiles:",
    "  library",
    "  app",
    "  service",
    "",
    "This replays fixture-backed expected install results without touching a target repository.",
  ].join("\n");
}

async function readFixtureOutput(profile) {
  const fixture = PROFILES[profile];
  const outputPath = path.join(
    ROOT_DIR,
    "install-manual",
    "fixtures",
    fixture.fixture,
    "expected",
    "install-result.txt",
  );
  return fs.readFile(outputPath, "utf8");
}

function intro(selectedProfiles) {
  return [
    "OpenSpec OPC Zero-Install Preview",
    "",
    "This preview replays fixture-backed install result cards so you can see the product's first successful moment before wiring it into your own repository.",
    "It does not mutate a target project and it does not require running the installer.",
    "",
    `Selected profiles: ${selectedProfiles.join(", ")}`,
  ].join("\n");
}

function sectionSeparator() {
  return "\n" + "=".repeat(72) + "\n";
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(helpText());
    return;
  }

  console.log(intro(parsed.profiles));
  for (const profile of parsed.profiles) {
    const fixture = PROFILES[profile];
    const output = await readFixtureOutput(profile);
    console.log(sectionSeparator());
    console.log(fixture.title);
    console.log(`Lane: ${fixture.lane}`);
    console.log(fixture.description);
    console.log("");
    console.log(output.trimEnd());
  }

  console.log(sectionSeparator());
  console.log("Next step");
  console.log("If the preview matches what you want, hand `openspec-opc/install.md` to your AI executor and let it perform the real install flow.");
}

try {
  await main();
} catch (error) {
  console.error(`preview-demo failed: ${error.message}`);
  process.exitCode = 1;
}
