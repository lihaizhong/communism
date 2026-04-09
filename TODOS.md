# TODOs

## OpenSpec OPC Runtime Guard Benchmark

- **What:** Add a benchmark for `collectWorkflowState()` / mutating hook latency with 10, 100, and 500 active OpenSpec work items.
- **Why:** Runtime guard checks currently scan `openspec/changes` and `openspec/bugs` on mutating tool calls. Large downstream repositories may feel edit latency if the scan cost grows.
- **Pros:** Gives future cache work a real baseline instead of optimizing by guesswork.
- **Cons:** Adds one maintenance surface; keep it out of the release gate until the benchmark is stable enough to avoid flaky local runs.
- **Context:** During `/plan-eng-review` for the OpenSpec OPC open-source refactor, we chose not to implement workflow-state caching in the release-critical cleanup. The follow-up should measure hook latency after the state path and core helper refactor lands, then decide whether caching is worth the safety complexity.
- **Depends on / blocked by:** Complete the OpenSpec OPC full architecture cleanup first, especially the state path rename and core helper extraction.
