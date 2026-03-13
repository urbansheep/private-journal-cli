# Structure

## Repository Layout
This repository is a compact TypeScript CLI/service project. The main source lives in `src/`, test coverage lives in `tests/`, design notes live in `docs/`, and compiled output is expected in `dist/` after a build.

## Top-Level Directories
- `src/`: application runtime code for the MCP server, journaling, storage paths, embeddings, and search.
- `tests/`: Jest test suite with filesystem-backed test cases and a shared mock setup.
- `docs/`: historical specification and implementation notes.
- `.planning/codebase/`: mapper-generated codebase reference documents, including this file and `ARCHITECTURE.md`.
- `dist/`: generated JavaScript, declaration files, and sourcemaps produced by `npm run build` from `tsconfig.json`. This directory is an output target, not a source directory.

## Root-Level Files
- `package.json`: package metadata, npm scripts, runtime dependencies, and CLI `bin` declaration pointing to `dist/index.js`.
- `package-lock.json`: npm lockfile.
- `tsconfig.json`: TypeScript compiler settings with `rootDir` set to `src/` and `outDir` set to `dist/`.
- `jest.config.js`: Jest + `ts-jest` configuration, coverage scope, test roots, and setup file registration.
- `README.md`: user-facing overview, installation guidance, tool descriptions, and storage examples.
- `AGENTS.md`: agent workflow and skill instructions specific to this repo.
- `CLAUDE.md`: supplemental guidance for Claude/Codex behavior in the repo.

## `src/` File Map
- `src/index.ts`: executable entry point with shebang, argument parsing, environment logging, path resolution, and server startup.
- `src/server.ts`: `PrivateJournalServer` implementation, MCP tool definitions, request handlers, and stdio transport connection.
- `src/journal.ts`: `JournalManager` write pipeline, markdown formatting, directory creation, thought splitting, and missing-embedding backfill.
- `src/search.ts`: `SearchService` retrieval pipeline for semantic search, recent-entry listing, and full-entry reads.
- `src/embeddings.ts`: `EmbeddingService` singleton wrapping `@xenova/transformers` plus serialization and similarity helpers.
- `src/paths.ts`: cross-platform storage path fallback rules.
- `src/types.ts`: small shared interface definitions.

## `tests/` File Map
- `tests/setup.ts`: global Jest mock for `@xenova/transformers`.
- `tests/paths.test.ts`: path fallback and environment-driven resolution tests.
- `tests/journal.test.ts`: journal write behavior, directory creation, frontmatter formatting, content splitting, and custom user path coverage.
- `tests/embeddings.test.ts`: embedding generation, markdown-to-search-text extraction, cosine similarity, persisted `.embedding` payloads, and search behavior.

## `docs/` File Map
- `docs/spec.md`: early project specification centered on the original `process_feelings` concept.
- `docs/implementation-plan.md`: phased implementation plan from the initial scope.
- `docs/initial-conversation.txt`: referenced in the repository file list but not required by the current runtime modules.

## Generated And Derived Output
- `dist/` is produced from `src/` and excluded from TypeScript source compilation inputs.
- `coverage/` is produced by Jest according to `jest.config.js` when coverage is collected.
- Runtime journal artifacts are not kept in the repo tree by default, but the application expects directories named `.private-journal/` under the current project and/or the user home directory.
- Each runtime journal entry creates two sibling files under a date directory:
  - ``YYYY-MM-DD/HH-MM-SS-ffffff.md`` for markdown content.
  - ``YYYY-MM-DD/HH-MM-SS-ffffff.embedding`` for serialized vector index data.

## Naming And Placement Conventions
- Runtime modules use one file per concern under `src/` rather than nested feature folders.
- Public classes are named for their domain role: `PrivateJournalServer`, `JournalManager`, `SearchService`, and `EmbeddingService`.
- Storage directories are date-based (`YYYY-MM-DD`) and files are time-based (`HH-MM-SS-ffffff`) to support chronological browsing without an external database.
- Markdown entries are the canonical record; `.embedding` files are colocated derived indexes.
- Project-specific data and user-global data are intentionally separated by base path, not by different file formats.
- Tests mirror source responsibilities by topic rather than by one-to-one filename parity.

## Dependency Placement
- Runtime dependencies in `package.json` are minimal and limited to `@modelcontextprotocol/sdk` and `@xenova/transformers`.
- Tooling dependencies are kept in `devDependencies` and include TypeScript, Jest, ESLint, Prettier, and type packages.
- No custom build scripts, bundlers, or framework directories are present; the repo relies on direct TypeScript compilation.

## Practical Orientation For Future Changes
- New MCP tools should be added in `src/server.ts` and delegated to focused service code rather than embedding logic directly into request handlers.
- New storage behaviors should stay coordinated with `src/paths.ts`, `src/journal.ts`, and `src/search.ts` so write paths and retrieval paths stay compatible.
- If new persisted artifacts are added, placing them beside the source `.md` entry follows the existing filesystem convention.
- If the project grows, `src/` is the most likely directory to need subfolders first; the current flat layout remains workable because the codebase is still small.
