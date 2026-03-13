# Architecture

## System Purpose
`private-journal-mcp` is a local stdio MCP server that lets an LLM write private journal entries, generate local embeddings, and retrieve prior notes through semantic search. The runtime is centered on a small Node.js/TypeScript service layer under `src/` and a filesystem-backed storage model rooted in `.private-journal/` directories.

## Primary Entry Points
- `src/index.ts` is the CLI entry point and npm `bin` target. It parses `--journal-path`, resolves the default project journal location via `resolveProjectJournalPath()`, logs environment diagnostics to stderr, constructs `PrivateJournalServer`, and starts it.
- `src/server.ts` is the MCP boundary. It owns MCP server construction, tool registration, request dispatch, startup-time backfill of embeddings, and stdio transport connection.
- `src/journal.ts` is the write path for journal content and the recovery path for missing embeddings.
- `src/search.ts` is the read/search path for retrieval-oriented tools.
- `src/embeddings.ts` is the local AI adapter for embedding generation, persistence, and cosine similarity.
- `src/paths.ts` centralizes storage path selection so CLI startup, writes, and search all use the same fallback logic.

## Module Responsibilities
- `src/index.ts`: process startup, argument parsing, path selection, and fatal error handling.
- `src/server.ts`: exposes MCP tools, validates request payloads, translates tool calls into `JournalManager` and `SearchService` calls, and formats plain-text responses for the client.
- `src/journal.ts`: creates dated directory trees, formats markdown with YAML frontmatter, splits project-local versus user-global thought sections, writes `.md` files, and writes sibling `.embedding` files.
- `src/search.ts`: loads stored embedding JSON, filters entries by type/section/date, computes similarity scores, sorts results, and reads full markdown entries when requested.
- `src/embeddings.ts`: lazily initializes `@xenova/transformers`, converts markdown into searchable text, saves and loads serialized embedding payloads, and calculates cosine similarity.
- `src/types.ts`: holds request and domain interfaces, including legacy `ProcessFeelingsRequest` and current multi-section thought shapes.

## Request And Data Flow
1. A client starts the executable generated from `src/index.ts`.
2. `src/index.ts` resolves the project journal root and instantiates `PrivateJournalServer` from `src/server.ts`.
3. `PrivateJournalServer.run()` calls `JournalManager.generateMissingEmbeddings()` before connecting the stdio transport, so previously written markdown entries can be indexed retroactively.
4. MCP clients call tools exposed by `ListToolsRequestSchema` in `src/server.ts`.
5. Write requests flow into `JournalManager` in `src/journal.ts`, which persists markdown first and then attempts embedding generation.
6. Search/list/read requests flow into `SearchService` in `src/search.ts`, which reads `.embedding` metadata or markdown files directly from disk.
7. Responses are returned as plain text content blocks rather than structured JSON payloads.

## Tool Surface
`src/server.ts` advertises four tools through `ListToolsRequestSchema`:
- `process_thoughts`
- `search_journal`
- `read_journal_entry`
- `list_recent_entries`

The call handler also still contains a `process_feelings` branch. That branch is not listed in the current tool catalog, which means it behaves like a legacy compatibility path in code rather than part of the documented public surface.

## Journal Storage Lifecycle
1. Path resolution starts in `src/paths.ts`.
2. Project-scoped notes prefer ``${cwd}/.private-journal`` when the current directory is considered safe.
3. User-scoped notes prefer ``${HOME}/.private-journal`` or ``${USERPROFILE}/.private-journal`` and only fall back to temp directories when needed.
4. `JournalManager.writeEntry()` writes a single markdown note into ``<project-journal>/YYYY-MM-DD/HH-MM-SS-ffffff.md``.
5. `JournalManager.writeThoughts()` splits content by intent:
   - `project_notes` stays under the project journal root.
   - `feelings`, `user_context`, `technical_insights`, and `world_knowledge` go under the user journal root.
6. File content is always markdown with YAML frontmatter fields for `title`, `date`, and `timestamp`.
7. Directory creation is lazy through `ensureDirectoryExists()` in `src/journal.ts`.
8. Filenames use second-level time plus pseudo-microseconds derived from milliseconds plus a random suffix to avoid collisions during rapid writes.

## Search And Indexing Flow
1. `EmbeddingService` in `src/embeddings.ts` lazily loads the `Xenova/all-MiniLM-L6-v2` feature extraction pipeline.
2. `JournalManager.generateEmbeddingForEntry()` strips frontmatter and section headers into a normalized searchable body using `extractSearchableText()`.
3. A sibling ``.embedding`` JSON file is written next to each markdown entry and stores `embedding`, `text`, `sections`, `timestamp`, and original `path`.
4. On startup, `JournalManager.generateMissingEmbeddings()` scans both the project and user journal roots, finds markdown files without corresponding `.embedding` files, and backfills them.
5. `SearchService.search()` embeds the query, loads all candidate embeddings from project and/or user stores, filters them, computes cosine similarity, applies `minScore`, and returns ranked excerpts.
6. `SearchService.listRecent()` reuses the same stored embedding metadata but sorts by `timestamp` instead of similarity.
7. `SearchService.readEntry()` bypasses the index and reads the markdown file directly.

## Error Handling Model
- Startup errors in `src/index.ts` are fatal and terminate the process with exit code `1`.
- Embedding failures during journal writes are logged but intentionally do not fail the write itself.
- Missing journal roots during search or indexing are treated as empty stores rather than fatal errors.
- Tool-level failures in `src/server.ts` are converted into request errors with contextual messages.

## Build, Runtime, And Test Boundaries
- `src/` is the hand-written runtime code compiled by TypeScript.
- `dist/` is the generated build output configured by `tsconfig.json` and used by `npm start` plus the published CLI binary.
- `tests/` contains Jest-based unit/integration-style tests that exercise filesystem behavior, path resolution, thought splitting, embedding persistence, and semantic search behavior.
- `tests/setup.ts` mocks `@xenova/transformers`, which keeps test execution local and deterministic without loading the actual model.
- `jest.config.js` scopes coverage to `src/journal.ts`, `src/types.ts`, `src/paths.ts`, `src/embeddings.ts`, and `src/search.ts`; the CLI and MCP transport boundary in `src/index.ts` and `src/server.ts` are not part of coverage collection.
- `package.json` keeps the build simple: `tsc` for compilation, Jest for tests, ESLint/Prettier for source maintenance, and `node dist/index.js` for runtime startup.

## Architectural Notes
- The design is intentionally filesystem-first: markdown is the source of truth, and `.embedding` files are rebuildable derived artifacts.
- The same singleton `EmbeddingService` is shared by write and read paths, reducing duplicate model initialization.
- Search quality depends on the presence and validity of `.embedding` files, but startup backfill reduces the risk of stale indexing after feature upgrades.
- Documentation in `README.md` and `docs/spec.md` still reflects earlier phases of the project; the codebase has evolved from a single `process_feelings` writer into a broader journaling and search server.
