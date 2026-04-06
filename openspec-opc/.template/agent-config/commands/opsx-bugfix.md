---
description: Fix a bug using the bugfix workflow
---

Fix a bug using the streamlined bugfix workflow.

I'll help you fix bugs efficiently with minimal overhead and proper regression testing.

**Input**: The argument after `/opsx-bugfix` is the bug ID (e.g., `login-button-error`), OR a description of the bug symptom.

**Steps**

1. **If no input provided, ask about the bug**

   Use the **AskUserQuestion tool** to ask:

   > "What bug are you trying to fix? Describe the symptom or error."

   Derive a kebab-case bug ID from the description (e.g., "login button not working" → `login-button-not-working`).

2. **Create the bugfix change**

   ```bash
   openspec new bugfix "<bug-id>"
   ```

   This creates `openspec/bugs/<bug-id>/` with `.openspec.yaml`.

3. **Check status and get instructions**

   ```bash
   openspec status --bugfix "<bug-id>" --json
   ```

   Parse to understand:
   - Required artifacts (typically: bug-report, fix)
   - Current status of each artifact

4. **Create bug-report.md**

   Get instructions:

   ```bash
   openspec instructions bug-report --bugfix "<bug-id>" --json
   ```

   Interview the user to fill in:
   - **Symptom**: What's happening?
   - **Steps_to_Reproduce**: How to trigger it?
   - **Expected_Behavior**: What should happen?
   - **Actual_Behavior**: What actually happens?
   - **Environment**: OS, browser, versions

   Use **AskUserQuestion** for any missing critical information.

5. **Reproduce the bug**

   Attempt to reproduce based on the bug report:
   - If successful, document any additional details
   - If cannot reproduce, ask user for more information

6. **Split work across three different subagents**

   Use three distinct subagents or worker sessions:
   - `red` subagent: only write the regression test
   - `green` subagent: only write the fix
   - `verify` subagent: only run validation and summarize

   These three phases must not reuse the same runtime session id.

7. **Acquire the phase lock before each phase**

   Before each phase starts, write `openspec/.opencode-spec-opc-state.json` with:
   - `mode: "apply"`
   - `kind: "bugfix"`
   - `name: "<bug-id>"`
   - `phase`: one of `red`, `green`, `verify`
   - `sessionId`: current phase runtime session id
   - `redSessionId`
   - `greenSessionId`
   - `verifySessionId`
   - `updatedAt`: current ISO timestamp

   Rules:
   - In `red` phase, set `redSessionId` to the current subagent session
   - In `green` phase, set `greenSessionId` to a different subagent session
   - In `verify` phase, set `verifySessionId` to a third subagent session
   - `red`, `green`, `verify` must all be different session ids

8. **Create fix.md and implement**

   Document in fix.md:
   - **Root_Cause**: The actual cause found
   - **Fix_Description**: What was changed
   - **Files_Changed**: Modified files list
   - **Testing_Strategy**: How it was tested

   Then implement:
   - Make minimal changes to fix the bug
   - Add a regression test
   - Run the project's validation commands from `openspec/config.yaml` (for example: unit tests, lint, type-check or static analysis)

9. **Mark complete and summarize**

   Show summary:
   - Bug ID and root cause
   - Files modified
   - Tests added
   - Validation status

**Output Example**

```
## Bugfix Complete: login-button-error

**Root Cause**: Event listener context binding issue

**Files Changed**:
- src/components/LoginButton.tsx
- <regression-test-file>

**Testing**: All validations pass ✓
```

**Guardrails**

- Only fix the bug, don't refactor unrelated code
- Every bugfix must include a regression test
- Always use three different subagent sessions for `red`, `green`, and `verify`
- Always refresh `openspec/.opencode-spec-opc-state.json` before each phase
- Document the root cause for future prevention
- For P0 critical bugs, use hotfix override
