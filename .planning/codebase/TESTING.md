# Testing Guide

## Framework and Entry Points
The repository uses Jest as the test runner, configured through `jest.config.js` with the `ts-jest` preset and `testEnvironment: 'node'`.
Tests live under `tests/` and are discovered with `testMatch: ['**/*.test.ts']`.
The current suite consists of `tests/journal.test.ts`, `tests/paths.test.ts`, and `tests/embeddings.test.ts`.
There are no test files for `src/index.ts`, `src/server.ts`, or direct end-to-end MCP transport behavior.

## How Tests Are Run
`package.json` exposes the main commands:
- `npm test` runs the full Jest suite.
- `npm run test:watch` runs Jest in watch mode.
- `npx jest tests/journal.test.ts` runs a single file, as documented in `AGENTS.md`.
Because `jest.config.js` sets `testTimeout: 60000`, slow async tests are expected and tolerated.
Some individual tests raise that further with per-test timeouts such as `30000`, `60000`, or `90000` in `tests/embeddings.test.ts`.

## Setup and Global Mocking
Global test setup is centralized in `tests/setup.ts`, referenced from `setupFilesAfterEnv` in `jest.config.js`.
That file mocks `@xenova/transformers` at module level so the suite never loads the real embedding model during Jest runs.
The mocked `pipeline` resolves to a fake extractor that returns a deterministic `Float32Array`, which keeps embedding tests fast, stable, and compatible with Jest's CommonJS environment.
This is an important repo convention: tests validate the code's orchestration around embeddings, not the behavior of the real model implementation.

## Test Style and Patterns
Tests are written in standard Jest style with `describe`, `beforeEach`, `afterEach`, and `test` blocks.
Assertions focus on observable outputs: file existence, frontmatter shape, directory layout, parsed sections, and returned search results.
The suite is mostly black-box against public class APIs such as `JournalManager.writeEntry`, `JournalManager.writeThoughts`, `EmbeddingService.generateEmbedding`, and `SearchService.search`.
Private helpers are not tested directly; they are exercised through public behavior.
Fixtures are kept inline instead of using separate fixture files, which makes the small suite easy to read but can lead to repetition.

## Temp Directory Usage and Isolation
Filesystem-heavy tests create isolated temp roots with `fs.mkdtemp(path.join(os.tmpdir(), ...))` in both `tests/journal.test.ts` and `tests/embeddings.test.ts`.
Those tests treat the filesystem as the real persistence layer rather than mocking `fs/promises`.
`afterEach` blocks remove temp directories with `fs.rm(..., { recursive: true, force: true })`, which keeps test runs self-cleaning.
Tests that depend on user-scoped storage temporarily override `process.env.HOME` and restore it afterward.
This pattern is used consistently to isolate project-local journal paths from user-global journal paths.

## Mocking Strategy By Area
`tests/setup.ts` mocks the transformer dependency globally.
`tests/paths.test.ts` uses `jest.spyOn(process, 'cwd')` and direct `process.env` mutation to simulate platform and environment differences.
The rest of the suite prefers real file IO, real JSON serialization, and real service composition instead of deep mocks.
This means persistence and search integration are reasonably well exercised, but transport-level MCP behavior is not.

## Coverage Configuration and Inferred Targets
`jest.config.js` collects coverage from:
- `src/journal.ts`
- `src/types.ts`
- `src/paths.ts`
- `src/embeddings.ts`
- `src/search.ts`
The config excludes `src/**/*.d.ts` and writes reports to `coverage/` using `text` and `lcov` reporters.
There are no explicit coverage thresholds in `jest.config.js`, so coverage is measured and reported but not enforced as a failing gate.
The included files make the intended quality target clear: core domain logic and search infrastructure are the focus, while CLI bootstrap and MCP server wiring are currently outside the coverage target.

## What Is Covered Well
`tests/journal.test.ts` covers date-folder creation, filename shape, frontmatter generation, handling of empty and large content, and the split between project-local and user-global thought sections.
`tests/paths.test.ts` covers the path fallback algorithm across current directory, home directory, Windows `USERPROFILE`, and `/tmp` fallbacks.
`tests/embeddings.test.ts` covers markdown cleanup, section extraction, cosine similarity, embedding file creation, and search behavior across stored entries.
The suite does a good job validating the repository's most important invariant: journaling and search features work correctly against the filesystem layout the app expects.

## Gaps and Risks
`src/server.ts` has no direct test coverage, so tool registration, input-schema drift, and response formatting could regress silently.
`src/index.ts` is also untested, including `--journal-path` argument parsing and the verbose stderr diagnostics path.
There are no tests for failure branches such as malformed `.embedding` JSON, transformer initialization failures, directory creation failures, or read errors other than `ENOENT`.
The suite does not assert startup backfill behavior from `PrivateJournalServer.run()`, even though `src/server.ts` contains meaningful startup logic.
`tests/journal.test.ts` sometimes assumes only one file exists in a directory after `writeThoughts`, but production code writes both `.md` and `.embedding` files; that mismatch suggests some tests may not fully reflect current behavior.
There are no tests for `SearchService.listRecent()` or `SearchService.readEntry()` even though both are exposed through MCP tools in `src/server.ts`.
The current mocking strategy avoids real model downloads, which is correct for unit tests, but there is no separate opt-in integration test path for exercising the real `@xenova/transformers` dependency.

## Practical Guidance For Future Tests
When adding tests, prefer the existing pattern of real temp directories plus minimal mocking, because it exercises the repository's core file layout and serialization rules.
If server functionality changes, add targeted tests around `src/server.ts` before expanding broader integration coverage; the current tool-surface drift is a concrete reason to do that.
If coverage gates are desired, add explicit thresholds to `jest.config.js` only after deciding whether `src/index.ts` and `src/server.ts` should join the covered set.
