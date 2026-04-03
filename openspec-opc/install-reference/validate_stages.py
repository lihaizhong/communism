#!/usr/bin/env python3

import json
import re
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT / "stage.schema.json"
STAGES_DIR = ROOT / "stages"

TOP_LEVEL_REQUIRED = [
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
]

STAGE_REQUIRED_FIELDS = {
    "prerequisite": ["steps"],
    "stage0": ["condition", "steps"],
    "stage1": ["steps"],
    "stage2": ["questions", "common_questions", "on_complete"],
    "stage3": ["branches", "test_framework_missing", "test_framework_recommendations", "on_complete"],
    "stage4": ["steps", "on_complete"],
    "stage5": ["pre_check", "core_tasks", "ci_config", "on_complete"],
    "stage6": ["steps", "on_complete"],
}

TASK_VAR_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
STEP_ID_RE = re.compile(r"^[a-z0-9_\-]+$")
QUESTION_ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
TASK_ID_RE = re.compile(r"^T[0-9]+$")
VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+$")


def fail(errors, path, message):
    errors.append(f"{path}: {message}")


def load_yaml(path):
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensure_keys(obj, keys, errors, path):
    if not isinstance(obj, dict):
        fail(errors, path, "must be an object")
        return
    for key in keys:
        if key not in obj:
            fail(errors, path, f"missing required key `{key}`")


def validate_task_vars(values, errors, path):
    if not isinstance(values, list):
        fail(errors, path, "must be an array")
        return
    seen = set()
    for i, value in enumerate(values):
        item_path = f"{path}[{i}]"
        if not isinstance(value, str):
            fail(errors, item_path, "must be a string")
            continue
        if not TASK_VAR_RE.match(value):
            fail(errors, item_path, "must be UPPER_SNAKE_CASE")
        if value in seen:
            fail(errors, item_path, "must not contain duplicates")
        seen.add(value)


def validate_action_block(value, errors, path):
    if not isinstance(value, dict):
        fail(errors, path, "must be an object")
        return
    if not value:
        fail(errors, path, "must not be empty")


def validate_options(options, errors, path):
    if not isinstance(options, list) or not options:
        fail(errors, path, "must be a non-empty array")
        return
    for i, option in enumerate(options):
        item_path = f"{path}[{i}]"
        ensure_keys(option, ["id", "label"], errors, item_path)
        if not isinstance(option, dict):
            continue
        option_id = option.get("id")
        if isinstance(option_id, str) and not STEP_ID_RE.match(option_id):
            fail(errors, f"{item_path}.id", "must match ^[a-z0-9_\\-]+$")


def validate_steps(steps, errors, path):
    if not isinstance(steps, list) or not steps:
        fail(errors, path, "must be a non-empty array")
        return
    for i, step in enumerate(steps):
        item_path = f"{path}[{i}]"
        ensure_keys(step, ["id", "name"], errors, item_path)
        if not isinstance(step, dict):
            continue
        step_id = step.get("id")
        if isinstance(step_id, str) and not STEP_ID_RE.match(step_id):
            fail(errors, f"{item_path}.id", "must match ^[a-z0-9_\\-]+$")
        options = step.get("options")
        if options is not None:
            validate_options(options, errors, f"{item_path}.options")
        for key in ("on_pass", "on_fail"):
            if key in step:
                validate_action_block(step[key], errors, f"{item_path}.{key}")
        if "on_select" in step:
            on_select = step["on_select"]
            if not isinstance(on_select, dict) or not on_select:
                fail(errors, f"{item_path}.on_select", "must be a non-empty object")


def validate_questions(questions, errors, path):
    if not isinstance(questions, dict) or not questions:
        fail(errors, path, "must be a non-empty object")
        return
    for category, items in questions.items():
        category_path = f"{path}.{category}"
        if not isinstance(items, list) or not items:
            fail(errors, category_path, "must be a non-empty array")
            continue
        for i, question in enumerate(items):
            item_path = f"{category_path}[{i}]"
            ensure_keys(question, ["id", "label", "type"], errors, item_path)
            if not isinstance(question, dict):
                continue
            qid = question.get("id")
            if isinstance(qid, str) and not QUESTION_ID_RE.match(qid):
                fail(errors, f"{item_path}.id", "must match ^[a-z][a-z0-9_]*$")
            qtype = question.get("type")
            if qtype not in {"select", "text", "bool"}:
                fail(errors, f"{item_path}.type", "must be one of select/text/bool")
            if qtype == "select" and "options" not in question:
                fail(errors, item_path, "type `select` requires `options`")


def validate_branches(branches, errors, path):
    if not isinstance(branches, dict):
        fail(errors, path, "must be an object")
        return
    for required in ("new_project", "existing_project"):
        if required not in branches:
            fail(errors, path, f"missing required key `{required}`")
    for key, branch in branches.items():
        branch_path = f"{path}.{key}"
        ensure_keys(branch, ["action"], errors, branch_path)
        if not isinstance(branch, dict):
            continue
        if "options" in branch:
            validate_options(branch["options"], errors, f"{branch_path}.options")


def validate_pre_check(items, errors, path):
    if not isinstance(items, list) or not items:
        fail(errors, path, "must be a non-empty array")
        return
    for i, item in enumerate(items):
        item_path = f"{path}[{i}]"
        ensure_keys(item, ["name"], errors, item_path)
        if not isinstance(item, dict):
            continue
        if "required_vars" in item:
            validate_task_vars(item["required_vars"], errors, f"{item_path}.required_vars")


def validate_task_items(items, errors, path):
    if not isinstance(items, list) or not items:
        fail(errors, path, "must be a non-empty array")
        return
    for i, item in enumerate(items):
        item_path = f"{path}[{i}]"
        ensure_keys(item, ["id", "name"], errors, item_path)
        if not isinstance(item, dict):
            continue
        task_id = item.get("id")
        if isinstance(task_id, str) and not TASK_ID_RE.match(task_id):
            fail(errors, f"{item_path}.id", "must match ^T[0-9]+$")
        if "options" in item:
            validate_options(item["options"], errors, f"{item_path}.options")


def validate_on_complete(value, errors, path):
    if not isinstance(value, dict) or not value:
        fail(errors, path, "must be a non-empty object")
        return
    if "new_project" in value or "existing_project" in value:
        for key in ("new_project", "existing_project"):
            if key not in value:
                fail(errors, path, f"missing required key `{key}`")


def validate_stage_file(path, schema, errors):
    data = load_yaml(path)
    file_path = str(path.relative_to(ROOT.parent))
    if not isinstance(data, dict):
      fail(errors, file_path, "root must be an object")
      return

    ensure_keys(data, TOP_LEVEL_REQUIRED, errors, file_path)

    version = data.get("version")
    if isinstance(version, str) and not VERSION_RE.match(version):
        fail(errors, f"{file_path}.version", "must match major.minor")
    if data.get("schema_version") != "2.0":
        fail(errors, f"{file_path}.schema_version", "must equal 2.0")
    if data.get("task_file") != "harness-install-tasks.md":
        fail(errors, f"{file_path}.task_file", "must equal harness-install-tasks.md")

    stage = data.get("stage")
    if stage not in STAGE_REQUIRED_FIELDS:
        fail(errors, f"{file_path}.stage", "must be a supported stage id")
        return

    validate_task_vars(data.get("inputs", []), errors, f"{file_path}.inputs")
    validate_task_vars(data.get("outputs", []), errors, f"{file_path}.outputs")

    fallback = data.get("fallback")
    if not isinstance(fallback, dict) or not fallback:
        fail(errors, f"{file_path}.fallback", "must be a non-empty object")

    conventions = data.get("variable_conventions")
    if not isinstance(conventions, dict):
        fail(errors, f"{file_path}.variable_conventions", "must be an object")
    elif conventions.get("case") != "UPPER_SNAKE_CASE for task variables":
        fail(errors, f"{file_path}.variable_conventions.case", "must equal `UPPER_SNAKE_CASE for task variables`")

    for required in STAGE_REQUIRED_FIELDS[stage]:
        if required not in data:
            fail(errors, file_path, f"stage `{stage}` missing required key `{required}`")

    if stage == "stage0" and data.get("condition") != "USER_REQUESTED_PROJECT_INIT == yes":
        fail(errors, f"{file_path}.condition", "must equal `USER_REQUESTED_PROJECT_INIT == yes`")

    if "steps" in data:
        validate_steps(data["steps"], errors, f"{file_path}.steps")
    if "questions" in data:
        validate_questions(data["questions"], errors, f"{file_path}.questions")
    if "common_questions" in data:
        if not isinstance(data["common_questions"], list):
            fail(errors, f"{file_path}.common_questions", "must be an array")
        else:
            validate_questions({"common": data["common_questions"]}, errors, f"{file_path}.common_questions")
    if "branches" in data:
        validate_branches(data["branches"], errors, f"{file_path}.branches")
    if "pre_check" in data:
        validate_pre_check(data["pre_check"], errors, f"{file_path}.pre_check")
    if "core_tasks" in data:
        validate_task_items(data["core_tasks"], errors, f"{file_path}.core_tasks")
    if "conditional_tasks" in data:
        validate_task_items(data["conditional_tasks"], errors, f"{file_path}.conditional_tasks")
    if "on_complete" in data:
        validate_on_complete(data["on_complete"], errors, f"{file_path}.on_complete")

    if stage == "stage3":
        tfm = data.get("test_framework_missing")
        if not isinstance(tfm, dict):
            fail(errors, f"{file_path}.test_framework_missing", "must be an object")
        else:
            ensure_keys(tfm, ["condition", "mandatory", "note", "prompt", "options", "on_cancel"], errors, f"{file_path}.test_framework_missing")

    if stage == "stage5":
        ci_config = data.get("ci_config")
        if not isinstance(ci_config, dict):
            fail(errors, f"{file_path}.ci_config", "must be an object")
        else:
            ensure_keys(ci_config, ["name", "prompt", "options", "on_select", "on_complete"], errors, f"{file_path}.ci_config")

    if schema.get("properties", {}).get("schema_version", {}).get("const") != "2.0":
        fail(errors, "stage.schema.json", "unexpected schema_version const")


def main():
    try:
        schema = load_json(SCHEMA_PATH)
    except Exception as exc:
        print(f"Failed to read schema: {exc}", file=sys.stderr)
        return 2

    stage_files = sorted(STAGES_DIR.glob("*.yaml"))
    if not stage_files:
        print("No stage YAML files found.", file=sys.stderr)
        return 2

    errors = []
    for path in stage_files:
        try:
            validate_stage_file(path, schema, errors)
        except Exception as exc:
            fail(errors, str(path.relative_to(ROOT.parent)), f"unexpected validation error: {exc}")

    if errors:
        print("Stage validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Validated {len(stage_files)} stage files against {SCHEMA_PATH.name}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
