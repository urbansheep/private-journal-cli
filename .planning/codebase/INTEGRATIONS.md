# Integrations

## Overview
- This repo is mostly self-contained; its integration points are the MCP protocol boundary, the local filesystem, and the local embedding runtime.
- There are no repo-defined SaaS or HTTP API integrations in `src/`; operational dependencies are libraries and host environment capabilities.
- The integration architecture is centered on `src/server.ts`, which translates MCP tool calls into file writes, embedding generation, and local search reads.

## MCP SDK Integration
- `src/server.ts` imports `Server` and `StdioServerTransport` from `@modelcontextprotocol/sdk` and uses stdio as the only transport.
- The process boundary is the main protocol boundary: an MCP client launches `dist/index.js`, then exchanges JSON-RPC style MCP messages over stdin/stdout.
- Tool discovery is exposed through `ListToolsRequestSchema`, and tool execution is handled through `CallToolRequestSchema`.
- Current advertised tools are `process_thoughts`, `search_journal`, `read_journal_entry`, and `list_recent_entries` in `src/server.ts`.
- A legacy `process_feelings` handler remains wired in `src/server.ts`; this is an internal compatibility detail rather than an actively advertised tool.

## Filesystem Integration
- The core persistence dependency is the host filesystem via Node `fs/promises` in `src/journal.ts`, `src/embeddings.ts`, and `src/search.ts`.
- `src/paths.ts` integrates with host environment variables and process state: `process.cwd()`, `HOME`, `USERPROFILE`, `TEMP`, and `TMP` determine storage placement.
- Project-scoped entries are written under a resolved `/.private-journal` path rooted in the current working directory when that directory is considered safe.
- User-scoped entries are written under `~/.private-journal` or the Windows-equivalent profile path.
- Each journal write produces a markdown file and, when searchable text exists, a sibling `.embedding` JSON file.
- Startup behavior in `src/server.ts` and `src/journal.ts` scans existing journal directories to backfill missing embedding files.

## Local Embedding Runtime
- `src/embeddings.ts` integrates with `@xenova/transformers` through the `pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')` API.
- The embedding model is initialized lazily and cached as a singleton via `EmbeddingService.getInstance()`.
- Searchable content is derived from markdown by stripping YAML frontmatter and section headers, while preserving the section names separately.
- Generated vectors are normalized by the transformer pipeline and then compared with repo-local cosine similarity logic in `src/embeddings.ts`.
- The repository itself does not define a remote model service; model loading and any underlying artifact resolution behavior are delegated to the transformer package.
- `package-lock.json` shows this library brings in `onnxruntime-web`, optional `onnxruntime-node`, and `sharp`, so the practical integration surface includes ONNX-backed inference dependencies.

## Search Pipeline Integration
- `src/journal.ts` calls `EmbeddingService.extractSearchableText()` and `EmbeddingService.generateEmbedding()` immediately after a successful journal write.
- The persisted `.embedding` payload contains `embedding`, `text`, `sections`, `timestamp`, and `path`, forming the repo’s local search index format.
- `src/search.ts` integrates the write-time index with query-time retrieval by loading every `.embedding` file from eligible date directories.
- Query text is embedded using the same model as stored entries, then ranked with in-memory cosine similarity.
- Filtering is applied before ranking for entry type (`project`, `user`, `both`), section names, and optional date ranges.
- Recent-entry listing reuses the same `.embedding` corpus but sorts by timestamp instead of semantic score.

## CLI and Packaging Boundaries
- `src/index.ts` is the CLI boundary; it accepts `--journal-path` and resolves it to an absolute path before constructing the server.
- `package.json` exposes the binary as `private-journal-mcp`, and `README.md` documents `npx github:obra/private-journal-mcp` as the expected invocation path.
- The packaging output is `dist/**/*`, plus `README.md` and `LICENSE`, as declared in `package.json`.
- Because the runtime is stdio-based, supervisors/clients are expected to manage process lifecycle rather than call a network endpoint.

## Test-Time Integration Controls
- `tests/setup.ts` replaces `@xenova/transformers` with a Jest mock so CI and local tests do not depend on real model initialization.
- `tests/journal.test.ts` and `tests/embeddings.test.ts` use temporary directories from the OS temp area to exercise filesystem integrations safely.
- `tests/paths.test.ts` validates environment-variable and current-directory integration behavior across Unix and Windows-like path scenarios.

## Operational Constraints and Assumptions
- Successful operation assumes readable/writable journal directories and enough disk space for both markdown entries and embedding sidecars.
- Search quality depends on the local embedding pipeline being available; failures are logged to stderr and do not block journal writes in `src/journal.ts`.
- Missing journal directories are treated as normal and produce empty search results rather than hard failures in `src/search.ts`.
- The repo’s privacy model depends on local execution and local storage; no code in `src/` sends journal contents to an application-defined remote service.
