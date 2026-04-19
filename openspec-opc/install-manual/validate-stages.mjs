#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(ROOT, "stage.schema.json");
const STAGES_DIR = path.join(ROOT, "stages");

const TOP_LEVEL_REQUIRED = [
  "version",
  "schema_version",
  "stage",
  "name",
  "description",
  "task_file",
  "inputs",
  "outputs",
  "fallback",
  "variable_conventions",
];

const STAGE_REQUIRED_FIELDS = {
  prerequisite: ["steps"],
  stage0: ["condition", "steps"],
  stage1: ["steps"],
  stage2: ["questions", "common_questions", "on_complete"],
  stage3: ["branches", "test_framework_missing", "test_framework_recommendations", "on_complete"],
  stage4: ["steps", "on_complete"],
  stage5: ["pre_check", "core_tasks", "ci_config", "on_complete"],
  stage6: ["steps", "on_complete"],
};

const TASK_VAR_RE = /^[A-Z][A-Z0-9_]*$/;
const STEP_ID_RE = /^[a-z0-9_-]+$/;
const QUESTION_ID_RE = /^[a-z][a-z0-9_]*$/;
const TASK_ID_RE = /^T[0-9]+(?:\.[0-9]+)?$/;
const VERSION_RE = /^[0-9]+\.[0-9]+$/;

function fail(errors, targetPath, message) {
  errors.push(`${targetPath}: ${message}`);
}

function loadYaml(filePath) {
  return parseYaml(fs.readFileSync(filePath, "utf8"));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ensureKeys(obj, keys, errors, targetPath) {
  if (!isPlainObject(obj)) {
    fail(errors, targetPath, "must be an object");
    return;
  }
  for (const key of keys) {
    if (!(key in obj)) {
      fail(errors, targetPath, `missing required key \`${key}\``);
    }
  }
}

function validateTaskVars(values, errors, targetPath) {
  if (!Array.isArray(values)) {
    fail(errors, targetPath, "must be an array");
    return;
  }
  const seen = new Set();
  values.forEach((value, index) => {
    const itemPath = `${targetPath}[${index}]`;
    if (typeof value !== "string") {
      fail(errors, itemPath, "must be a string");
      return;
    }
    if (!TASK_VAR_RE.test(value)) {
      fail(errors, itemPath, "must be UPPER_SNAKE_CASE");
    }
    if (seen.has(value)) {
      fail(errors, itemPath, "must not contain duplicates");
    }
    seen.add(value);
  });
}

function validateActionBlock(value, errors, targetPath) {
  if (!isPlainObject(value)) {
    fail(errors, targetPath, "must be an object");
    return;
  }
  if (Object.keys(value).length === 0) {
    fail(errors, targetPath, "must not be empty");
  }
}

function validateOptions(options, errors, targetPath) {
  if (!Array.isArray(options) || options.length === 0) {
    fail(errors, targetPath, "must be a non-empty array");
    return;
  }
  options.forEach((option, index) => {
    const itemPath = `${targetPath}[${index}]`;
    ensureKeys(option, ["id", "label"], errors, itemPath);
    if (!isPlainObject(option)) {
      return;
    }
    if (typeof option.id === "string" && !STEP_ID_RE.test(option.id)) {
      fail(errors, `${itemPath}.id`, "must match ^[a-z0-9_\\-]+$");
    }
  });
}

function validateSteps(steps, errors, targetPath) {
  if (!Array.isArray(steps) || steps.length === 0) {
    fail(errors, targetPath, "must be a non-empty array");
    return;
  }
  steps.forEach((step, index) => {
    const itemPath = `${targetPath}[${index}]`;
    ensureKeys(step, ["id", "name"], errors, itemPath);
    if (!isPlainObject(step)) {
      return;
    }
    if (typeof step.id === "string" && !STEP_ID_RE.test(step.id)) {
      fail(errors, `${itemPath}.id`, "must match ^[a-z0-9_\\-]+$");
    }
    if ("options" in step) {
      validateOptions(step.options, errors, `${itemPath}.options`);
    }
    for (const key of ["on_pass", "on_fail"]) {
      if (key in step) {
        validateActionBlock(step[key], errors, `${itemPath}.${key}`);
      }
    }
    if ("on_select" in step) {
      if (!isPlainObject(step.on_select) || Object.keys(step.on_select).length === 0) {
        fail(errors, `${itemPath}.on_select`, "must be a non-empty object");
      }
    }
  });
}

function validateQuestions(questions, errors, targetPath) {
  if (!isPlainObject(questions) || Object.keys(questions).length === 0) {
    fail(errors, targetPath, "must be a non-empty object");
    return;
  }
  for (const [category, items] of Object.entries(questions)) {
    const categoryPath = `${targetPath}.${category}`;
    if (!Array.isArray(items) || items.length === 0) {
      fail(errors, categoryPath, "must be a non-empty array");
      continue;
    }
    items.forEach((question, index) => {
      const itemPath = `${categoryPath}[${index}]`;
      ensureKeys(question, ["id", "label", "type"], errors, itemPath);
      if (!isPlainObject(question)) {
        return;
      }
      if (typeof question.id === "string" && !QUESTION_ID_RE.test(question.id)) {
        fail(errors, `${itemPath}.id`, "must match ^[a-z][a-z0-9_]*$");
      }
      if (!["select", "text", "bool"].includes(question.type)) {
        fail(errors, `${itemPath}.type`, "must be one of select/text/bool");
      }
      if (question.type === "select" && !("options" in question)) {
        fail(errors, itemPath, "type `select` requires `options`");
      }
    });
  }
}

function validateBranches(branches, errors, targetPath) {
  if (!isPlainObject(branches)) {
    fail(errors, targetPath, "must be an object");
    return;
  }
  for (const required of ["new_project", "existing_project"]) {
    if (!(required in branches)) {
      fail(errors, targetPath, `missing required key \`${required}\``);
    }
  }
  for (const [key, branch] of Object.entries(branches)) {
    const branchPath = `${targetPath}.${key}`;
    ensureKeys(branch, ["action"], errors, branchPath);
    if (!isPlainObject(branch)) {
      continue;
    }
    if ("options" in branch) {
      validateOptions(branch.options, errors, `${branchPath}.options`);
    }
  }
}

function validatePreCheck(items, errors, targetPath) {
  if (!Array.isArray(items) || items.length === 0) {
    fail(errors, targetPath, "must be a non-empty array");
    return;
  }
  items.forEach((item, index) => {
    const itemPath = `${targetPath}[${index}]`;
    ensureKeys(item, ["name"], errors, itemPath);
    if (!isPlainObject(item)) {
      return;
    }
    if ("required_vars" in item) {
      validateTaskVars(item.required_vars, errors, `${itemPath}.required_vars`);
    }
  });
}

function validateTaskItems(items, errors, targetPath) {
  if (!Array.isArray(items) || items.length === 0) {
    fail(errors, targetPath, "must be a non-empty array");
    return;
  }
  items.forEach((item, index) => {
    const itemPath = `${targetPath}[${index}]`;
    ensureKeys(item, ["id", "name"], errors, itemPath);
    if (!isPlainObject(item)) {
      return;
    }
    if (typeof item.id === "string" && !TASK_ID_RE.test(item.id)) {
      fail(errors, `${itemPath}.id`, "must match ^T[0-9]+(?:\\.[0-9]+)?$");
    }
    if ("options" in item) {
      validateOptions(item.options, errors, `${itemPath}.options`);
    }
  });
}

function validateOnComplete(value, errors, targetPath) {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    fail(errors, targetPath, "must be a non-empty object");
    return;
  }
  if ("new_project" in value || "existing_project" in value) {
    for (const key of ["new_project", "existing_project"]) {
      if (!(key in value)) {
        fail(errors, targetPath, `missing required key \`${key}\``);
      }
    }
  }
}

function validateStageFile(filePath, schema, errors) {
  const data = loadYaml(filePath);
  const relativePath = path.relative(path.dirname(ROOT), filePath);
  if (!isPlainObject(data)) {
    fail(errors, relativePath, "root must be an object");
    return;
  }

  ensureKeys(data, TOP_LEVEL_REQUIRED, errors, relativePath);

  if (typeof data.version === "string" && !VERSION_RE.test(data.version)) {
    fail(errors, `${relativePath}.version`, "must match major.minor");
  }
  if (data.schema_version !== "2.0") {
    fail(errors, `${relativePath}.schema_version`, "must equal 2.0");
  }
  if (data.task_file !== "harness-install-tasks.md") {
    fail(errors, `${relativePath}.task_file`, "must equal harness-install-tasks.md");
  }

  const stage = data.stage;
  if (!(stage in STAGE_REQUIRED_FIELDS)) {
    fail(errors, `${relativePath}.stage`, "must be a supported stage id");
    return;
  }

  validateTaskVars(data.inputs ?? [], errors, `${relativePath}.inputs`);
  validateTaskVars(data.outputs ?? [], errors, `${relativePath}.outputs`);

  if (!isPlainObject(data.fallback) || Object.keys(data.fallback).length === 0) {
    fail(errors, `${relativePath}.fallback`, "must be a non-empty object");
  }

  if (!isPlainObject(data.variable_conventions)) {
    fail(errors, `${relativePath}.variable_conventions`, "must be an object");
  } else if (data.variable_conventions.case !== "UPPER_SNAKE_CASE for task variables") {
    fail(errors, `${relativePath}.variable_conventions.case`, "must equal `UPPER_SNAKE_CASE for task variables`");
  }

  for (const required of STAGE_REQUIRED_FIELDS[stage]) {
    if (!(required in data)) {
      fail(errors, relativePath, `stage \`${stage}\` missing required key \`${required}\``);
    }
  }

  if (stage === "stage0" && data.condition !== "USER_REQUESTED_PROJECT_INIT == yes") {
    fail(errors, `${relativePath}.condition`, "must equal `USER_REQUESTED_PROJECT_INIT == yes`");
  }

  if ("steps" in data) {
    validateSteps(data.steps, errors, `${relativePath}.steps`);
  }
  if ("questions" in data) {
    validateQuestions(data.questions, errors, `${relativePath}.questions`);
  }
  if ("common_questions" in data) {
    if (!Array.isArray(data.common_questions)) {
      fail(errors, `${relativePath}.common_questions`, "must be an array");
    } else {
      validateQuestions({ common: data.common_questions }, errors, `${relativePath}.common_questions`);
    }
  }
  if ("branches" in data) {
    validateBranches(data.branches, errors, `${relativePath}.branches`);
  }
  if ("pre_check" in data) {
    validatePreCheck(data.pre_check, errors, `${relativePath}.pre_check`);
  }
  if ("core_tasks" in data) {
    validateTaskItems(data.core_tasks, errors, `${relativePath}.core_tasks`);
  }
  if ("conditional_tasks" in data) {
    validateTaskItems(data.conditional_tasks, errors, `${relativePath}.conditional_tasks`);
  }
  if ("on_complete" in data) {
    validateOnComplete(data.on_complete, errors, `${relativePath}.on_complete`);
  }

  if (stage === "stage3") {
    if (!isPlainObject(data.test_framework_missing)) {
      fail(errors, `${relativePath}.test_framework_missing`, "must be an object");
    } else {
      ensureKeys(
        data.test_framework_missing,
        ["condition", "mandatory", "note", "prompt", "options", "on_cancel"],
        errors,
        `${relativePath}.test_framework_missing`,
      );
    }
  }

  if (stage === "stage5") {
    if (!isPlainObject(data.ci_config)) {
      fail(errors, `${relativePath}.ci_config`, "must be an object");
    } else {
      ensureKeys(data.ci_config, ["name", "prompt", "options", "on_select", "on_complete"], errors, `${relativePath}.ci_config`);
    }
  }

  if (schema?.properties?.schema_version?.const !== "2.0") {
    fail(errors, "stage.schema.json", "unexpected schema_version const");
  }
}

function main() {
  let schema;
  try {
    schema = loadJson(SCHEMA_PATH);
  } catch (error) {
    console.error(`Failed to read schema: ${error.message}`);
    return 2;
  }

  const stageFiles = fs
    .readdirSync(STAGES_DIR)
    .filter((name) => name.endsWith(".yaml"))
    .sort()
    .map((name) => path.join(STAGES_DIR, name));

  if (stageFiles.length === 0) {
    console.error("No stage YAML files found.");
    return 2;
  }

  const errors = [];
  for (const filePath of stageFiles) {
    try {
      validateStageFile(filePath, schema, errors);
    } catch (error) {
      fail(errors, path.relative(path.dirname(ROOT), filePath), `unexpected validation error: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Stage validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    return 1;
  }

  console.log(`Validated ${stageFiles.length} stage files against ${path.basename(SCHEMA_PATH)}.`);
  return 0;
}

process.exit(main());
