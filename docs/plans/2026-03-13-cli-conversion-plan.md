# CLI Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the existing private journal MCP server into a direct CLI for AI agents while preserving local journal storage and semantic search behavior.

**Architecture:** Add a reusable CLI dispatcher in `src/cli.ts`, keep the domain logic in `src/journal.ts` and `src/search.ts`, and turn `src/index.ts` into a thin process wrapper. Remove MCP-specific startup paths and package identity once the CLI commands are covered by tests.

**Tech Stack:** Node.js, TypeScript, Jest, ts-jest, existing filesystem and transformer-based search modules.

---

### Task 1: CLI skeleton and help contract

**Files:**
- Create: `src/cli.ts`
- Modify: `src/index.ts`
- Test: `tests/cli.test.ts`

**Step 1: Write the failing test**

Add tests that assert:
- running with no args prints help and returns exit code 0
- `help` prints available commands
- unknown commands return non-zero with an error message

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli.test.ts`
Expected: FAIL because CLI dispatcher does not exist yet.

**Step 3: Write minimal implementation**

Create `src/cli.ts` with a dispatcher, help text, and simple output abstraction. Update `src/index.ts` to call it.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cli.ts src/index.ts tests/cli.test.ts
git commit -m "feat: add CLI dispatcher"
```

### Task 2: Write commands

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/journal.ts`
- Modify: `src/types.ts`
- Test: `tests/cli.test.ts`
- Test: `tests/journal.test.ts`

**Step 1: Write the failing test**

Add CLI tests for:
- `write --content ...`
- `thoughts --feelings ... --technical-insights ...`
- path override flags returning created file metadata

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli.test.ts`
Expected: FAIL because write commands are not implemented.

**Step 3: Write minimal implementation**

Add write command handlers, return created file paths/section metadata, and keep Markdown plus `.embedding` generation intact.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli.test.ts tests/journal.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cli.ts src/journal.ts src/types.ts tests/cli.test.ts tests/journal.test.ts
git commit -m "feat: add CLI write commands"
```

### Task 3: Retrieval commands and JSON output

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/search.ts`
- Test: `tests/cli.test.ts`
- Test: `tests/embeddings.test.ts`

**Step 1: Write the failing test**

Add CLI tests for:
- `search --query ... --json`
- `read --path ... --json`
- `recent --limit ... --days ... --json`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli.test.ts`
Expected: FAIL because retrieval subcommands are not implemented.

**Step 3: Write minimal implementation**

Add retrieval handlers, stable JSON payloads, and distinct non-zero exit codes for usage versus runtime errors.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli.test.ts tests/embeddings.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cli.ts src/search.ts tests/cli.test.ts tests/embeddings.test.ts
git commit -m "feat: add CLI retrieval commands"
```

### Task 4: Package migration and MCP cleanup

**Files:**
- Modify: `package.json`
- Delete or retire: `src/server.ts`
- Modify: `src/types.ts`
- Test: `tests/cli.test.ts`

**Step 1: Write the failing test**

Add assertions that package-facing metadata and help output no longer refer to MCP.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli.test.ts`
Expected: FAIL because MCP-specific naming still exists.

**Step 3: Write minimal implementation**

Rename the package/bin, remove the MCP dependency and server path from runtime usage, and delete stale request types that no longer apply.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json src/server.ts src/types.ts tests/cli.test.ts
git commit -m "refactor: remove MCP runtime"
```

### Task 5: Final verification

**Files:**
- Modify as needed from earlier tasks
- Verify: `tests/*.ts`

**Step 1: Run targeted CLI and regression tests**

Run: `npm test -- tests/cli.test.ts tests/journal.test.ts tests/embeddings.test.ts tests/paths.test.ts`
Expected: PASS.

**Step 2: Run full verification**

Run:
- `npm test`
- `npm run build`

Expected: both succeed with no MCP runtime regressions.

**Step 3: Commit final cleanup if needed**

```bash
git add package.json src tests
git commit -m "test: verify CLI conversion"
```
