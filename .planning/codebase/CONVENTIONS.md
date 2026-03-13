# Code Conventions

## Scope
This document describes the coding conventions actually used in this repository, based on `src/index.ts`, `src/server.ts`, `src/journal.ts`, `src/paths.ts`, `src/embeddings.ts`, `src/search.ts`, and `src/types.ts`.
It is descriptive first: it captures current patterns, plus a few consistency issues that stand out during mapping.

## TypeScript Style
The codebase uses strict TypeScript compilation from `tsconfig.json` with `"strict": true`, `"module": "CommonJS"`, and `"target": "ES2020`.
Imports are grouped at the top of each file and mostly use namespace imports for Node built-ins, for example `import * as fs from 'fs/promises'` and `import * as path from 'path'` in `src/journal.ts` and `src/search.ts`.
Project-local imports are relative and extensionless, such as `./journal`, `./paths`, and `./search`.
Classes and exported interfaces use PascalCase, for example `PrivateJournalServer`, `JournalManager`, `EmbeddingService`, `SearchService`, `JournalEntry`, and `SearchOptions`.
Functions, methods, variables, and object keys use camelCase, for example `parseArguments`, `resolveProjectJournalPath`, `generateMissingEmbeddings`, and `extractSearchableText`.
Request payload fields intentionally preserve snake_case where that is part of the external tool contract, for example `project_notes`, `user_context`, and `technical_insights` in `src/types.ts` and `src/server.ts`.
Return types are typically explicit on public or important functions, for example `async run(): Promise<void>` in `src/server.ts` and `resolveUserJournalPath(): string` in `src/paths.ts`.
The code favors simple inline object typing for one-off shapes, especially in `src/journal.ts`, instead of extracting every shape into a named interface.

## Naming and Structure
Files are organized by responsibility, with one primary concern per module: CLI bootstrap in `src/index.ts`, MCP transport and tool dispatch in `src/server.ts`, persistence in `src/journal.ts`, path policy in `src/paths.ts`, embeddings in `src/embeddings.ts`, and retrieval in `src/search.ts`.
Method names are verb-oriented and operational: `writeEntry`, `writeThoughts`, `saveEmbedding`, `loadEmbedding`, `readEntry`, and `listRecent`.
Helper methods are private when they are implementation details, for example `formatDate`, `formatTimestamp`, `generateExcerpt`, and `loadEmbeddingsFromPath`.
Comments are sparse and mostly used for module-level summaries or short intent notes, including the repeated `ABOUTME` header comments in source files.

## Error Handling Patterns
The dominant pattern is `try/catch` around filesystem and model operations, with error messages wrapped into higher-level context before rethrowing.
`src/server.ts` validates request arguments eagerly and throws plain `Error` instances for invalid input, such as missing `query`, `path`, or empty thought payloads.
When wrapping an error, the code usually normalizes unknown exceptions with `error instanceof Error ? error.message : 'Unknown error occurred'`.
Non-critical background work is deliberately soft-failed: `src/journal.ts` logs embedding generation failures and continues writing the journal entry, and `src/server.ts` logs startup embedding backfill failures without aborting server startup.
Missing-file cases are handled as expected absence rather than fatal errors in `src/search.ts` and `src/embeddings.ts`, typically by checking `ENOENT` and returning `null` or an empty array.
One weaker spot is the recurring `(error as any)?.code` pattern in `src/journal.ts`, `src/search.ts`, and `src/embeddings.ts`; it works, but it bypasses the otherwise strict typing discipline.

## Filesystem Patterns
All filesystem access uses promise-based Node APIs from `fs/promises`; there is no callback-style IO.
Paths are always composed with `path.join` or `path.resolve`, never string concatenation.
Journal storage is date-bucketed under `YYYY-MM-DD/HH-MM-SS-ffffff.md`, as implemented by `formatDate` and `formatTimestamp` in `src/journal.ts`.
Directory creation is centralized through `ensureDirectoryExists` in `src/journal.ts`, which first checks access and then creates recursively.
Path selection is defensive and environment-aware in `src/paths.ts`: project storage prefers the current working directory when it is not an obvious system root, and user storage skips the current working directory entirely.
The repository distinguishes content files and derived index files by extension: markdown entries use `.md` and semantic search data uses sibling `.embedding` JSON files in `src/embeddings.ts`.
Startup maintenance is built into `PrivateJournalServer.run()` in `src/server.ts`, which backfills missing `.embedding` files before opening stdio transport.

## Data Model Conventions
Structured domain types live in `src/types.ts` and `src/search.ts` as interfaces rather than type aliases.
Timestamps appear in three parallel forms throughout the system: `Date` objects in process memory, ISO strings in frontmatter, and Unix epoch milliseconds in frontmatter and embedding payloads.
Markdown entries use YAML frontmatter with `title`, `date`, and `timestamp`, followed by either raw body text or named `##` sections generated in `src/journal.ts`.
Embedding payloads in `src/embeddings.ts` are plain JSON objects with `embedding`, `text`, `sections`, `timestamp`, and `path`.
Search result models in `src/search.ts` extend stored embedding data with derived fields such as `score`, `excerpt`, and `type`.
The code uses explicit discriminated string unions for cross-boundary options, especially `'project' | 'user' | 'both'` in `src/search.ts` and `src/server.ts`.

## CLI and Server Patterns
`src/index.ts` is a thin CLI entry point: parse arguments, resolve a journal path, log environment diagnostics to stderr, construct `PrivateJournalServer`, and call `run()`.
The CLI accepts `--journal-path` as an override and otherwise delegates resolution to `resolveProjectJournalPath()` from `src/paths.ts`.
`src/server.ts` owns MCP registration and request dispatch in one class. Tool schemas are declared inline inside `setupToolHandlers()` rather than extracted into separate modules.
Each tool handler follows the same structure: validate arguments, build an options object if needed, call a service method, and return a text response payload.
Service boundaries are clean at a high level: `JournalManager` owns writes and backfill, `EmbeddingService` owns vector-related work, and `SearchService` owns retrieval.

## Consistency Notes
The largest visible naming inconsistency is in `src/server.ts`: `ListToolsRequestSchema` advertises `process_thoughts`, but `CallToolRequestSchema` still contains a separate `process_feelings` branch based on the older API shape. That suggests an incomplete migration.
`src/types.ts` still exports `ProcessFeelingsRequest`, even though the newer surface appears to be `ProcessThoughtsRequest`.
Coverage collection in `jest.config.js` targets `src/journal.ts`, `src/types.ts`, `src/paths.ts`, `src/embeddings.ts`, and `src/search.ts`, but not `src/index.ts` or `src/server.ts`; this mirrors a practical testing focus, not a full-system one.
Formatting and lint scripts in `package.json` only target `src/**/*.ts`, so test files are not part of the configured lint/format surface.
The codebase is generally consistent in module layout and naming, but there is a clear split between newer search/thoughts features and the earlier feelings-only server contract that has not been fully cleaned up.

## Practical Guidance For Future Changes
New code should match the existing service-per-module structure and keep Node IO async with `fs/promises`.
If a new external tool field becomes part of the MCP contract, keep its exact wire name in snake_case at the boundary, but map internal helper names consistently in camelCase.
When adding failure handling, follow the repo's existing rule: user-visible operations should throw contextual errors, while optional background work should log and continue.
If the old `process_feelings` flow is removed, update `src/server.ts`, `src/types.ts`, and tests together so the public tool list and handler branches stay aligned.
