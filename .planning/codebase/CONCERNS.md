# Codebase Concerns

## Overall Risk Profile
This repository is small and understandable, but it carries outsized risk in three areas: privacy guarantees, unsafe file access, and search/indexing fragility. The code promises a "private journal", yet several implementation choices in `src/index.ts`, `src/server.ts`, `src/journal.ts`, `src/search.ts`, and `src/embeddings.ts` weaken that claim in practice.

## High-Severity Concerns

### 1. Arbitrary local file read is exposed through the MCP surface
`src/server.ts` accepts any `path` string for `read_journal_entry`, and `src/search.ts` passes that directly to `fs.readFile()` with no path restriction or allowlist check.
Impact:
- Any caller that can invoke the MCP tool can ask the server to read non-journal files such as shell config, SSH-related files, API keys, or unrelated project files.
- This breaks the intended boundary of "read a journal entry from search results" and turns the tool into a generic local file reader.
Likely mitigation:
- Restrict reads to files under the resolved project and user journal roots.
- Canonicalize with `path.resolve()` and reject paths outside those roots.
- Consider replacing raw-path reads with opaque entry IDs returned by search/list APIs.

### 2. Startup logging leaks sensitive machine and filesystem metadata
`src/index.ts` prints `HOME`, `USERPROFILE`, `TEMP`, `TMP`, usernames, current working directory, and the selected journal path to `stderr` on every startup.
Impact:
- MCP hosts commonly capture or forward stderr to logs, developer consoles, or bug reports.
- The current behavior leaks private filesystem layout and user identity information even before any journal content is written.
- This directly conflicts with the privacy-first positioning in `README.md`.
Likely mitigation:
- Remove verbose environment logging from normal startup.
- Gate diagnostics behind an explicit debug flag such as `DEBUG=private-journal-mcp`.
- Never log home-directory paths or usernames by default.

### 3. Sensitive journal content is duplicated into `.embedding` sidecar files
`src/embeddings.ts` persists not just vectors but also the cleaned journal text and absolute entry path inside each `.embedding` file.
Impact:
- Every indexed entry now exists twice on disk, widening the exposure surface for backups, grep, sync tools, and accidental disclosure.
- Absolute paths inside `.embedding` files also reveal project layout and user home structure.
- Any corruption or leakage now affects both the markdown entry and the sidecar JSON.
Likely mitigation:
- Store only embedding vectors and minimal metadata needed for retrieval.
- Reconstruct excerpts from the markdown file when needed.
- If plaintext must remain cached, document that tradeoff explicitly and consider permission hardening.

## Correctness and Data-Integrity Risks

### 4. Search and "recent entries" treat embeddings as the source of truth
`src/search.ts` only loads `.embedding` files. `src/journal.ts` explicitly swallows embedding-generation failures and still reports successful writes.
Impact:
- A journal write can succeed while the entry becomes invisible to `search_journal` and `list_recent_entries`.
- Any model initialization failure, malformed embedding file, or sidecar write failure creates silent data discoverability loss.
Likely mitigation:
- Make markdown entries the source of truth for listing recent items.
- Backfill search results from `.md` files when embeddings are missing.
- Expose indexing health so callers know entries may exist but be temporarily unindexed.

### 5. Embedding initialization is effectively unrecoverable after one failure
`src/embeddings.ts` caches `initPromise`, but if model loading fails once, that rejected promise is reused forever and there is no retry/reset path.
Impact:
- A transient startup issue can poison semantic search for the lifetime of the process.
- The server may appear "up" while all embedding-backed features remain permanently broken.
Likely mitigation:
- Clear `initPromise` on failure so a later request can retry.
- Add explicit health state and surfacing for index/model readiness.

### 6. Timestamp-based filenames are not collision-safe under concurrent writes
`src/journal.ts` synthesizes "microseconds" from `milliseconds * 1000 + random(0..999)` and writes with plain `fs.writeFile()`.
Impact:
- Concurrent writes in the same millisecond can still collide and overwrite because there is no exclusive file creation.
- The randomness is only collision reduction, not uniqueness enforcement.
Likely mitigation:
- Use `fs.open(..., 'wx')` or a loop that retries on `EEXIST`.
- Consider UUID suffixes or monotonic counters instead of faux microseconds.

### 7. Malformed `.embedding` files can break search behavior in surprising ways
`src/search.ts` trusts parsed JSON shape from `.embedding` files and later assumes vector lengths and field types are valid.
Impact:
- A corrupted or manually edited sidecar can cause runtime errors or inconsistent scores.
- One bad file can degrade or fail an entire search request rather than just being skipped safely.
Likely mitigation:
- Validate parsed embedding schema before using it.
- Skip invalid sidecars with bounded logging and optional repair/backfill.

## Privacy and Operational Concerns

### 8. Fallback to `/tmp` for personal journals is weak for privacy and retention
`src/paths.ts` will place user-global journal data under `/tmp/.private-journal` if home-directory variables are unavailable.
Impact:
- `/tmp` is a poor default for something positioned as private memory: retention is unstable, cleanup is external, and the location is easier to inspect accidentally.
- This also increases the chance of user confusion when entries "disappear" after temp cleanup.
Likely mitigation:
- Fail closed for user-global storage if no stable home directory exists.
- If a temp fallback remains, require explicit opt-in and warn clearly.

### 9. Startup does unbounded synchronous maintenance work
`src/server.ts` runs `generateMissingEmbeddings()` before connecting the stdio transport, and `src/journal.ts` scans all day directories serially.
Impact:
- Large journals will make startup slow and unpredictable.
- A server invoked on demand by an MCP host may look hung while backfilling old data.
Likely mitigation:
- Connect transport first, then backfill in the background.
- Add batching, throttling, and progress accounting.
- Persist last-indexed state to avoid full-tree scans on every process start.

### 10. Search cost scales linearly with journal size and file count
Every `search_journal` and `list_recent_entries` call re-reads directory trees and parses every `.embedding` file in `src/search.ts`.
Impact:
- Query latency will degrade steadily as the journal grows.
- Repeated calls pay the same disk I/O cost because there is no in-memory cache or incremental index.
Likely mitigation:
- Maintain an in-memory index for the process lifetime.
- Add incremental loading or a compact aggregated index file.
- Separate expensive semantic search from recent-entry listing.

## Documentation, Testing, and Maintenance Gaps

### 11. Tooling/docs are out of sync with the current implementation
`docs/spec.md` and `docs/implementation-plan.md` still center `process_feelings`, while `README.md` documents four tools and `src/server.ts` only advertises `process_thoughts`, `search_journal`, `read_journal_entry`, and `list_recent_entries` in `ListTools`.
Impact:
- Maintainers and users cannot rely on a single accurate contract.
- The hidden `process_feelings` handler looks like an undocumented compatibility path or leftover implementation.
Likely mitigation:
- Choose the canonical tool surface and update docs, tests, and code together.
- Remove dead compatibility code if not intentionally supported.

### 12. The test suite appears stale relative to current journal/index behavior
`tests/journal.test.ts` expects file counts that do not match the current code path in `src/journal.ts` and `src/embeddings.ts`:
- non-empty writes should produce both `.md` and `.embedding` files, but several tests expect only one file
- empty writes should skip embedding generation, but a test expects two files
Impact:
- Even without running the suite, the assertions indicate the tests are not tracking the implementation.
- This reduces confidence in future refactors and makes green CI less meaningful if the suite is rarely exercised.
Likely mitigation:
- Reconcile tests with the current behavior immediately.
- Add direct coverage for `src/server.ts`, path restriction, malformed sidecars, and startup indexing behavior.

## Fragile Areas To Watch
- `src/server.ts`: tool contract drift, unsafe read path handling, and user-facing text formatting are all concentrated here.
- `src/journal.ts`: write path, split-storage policy, and indexing side effects are tightly coupled.
- `src/search.ts`: current design assumes embeddings are always present, valid, and cheap to load.
- `src/embeddings.ts`: model lifecycle and persistence format decisions have direct privacy and reliability impact.
