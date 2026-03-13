# Technology Stack

## Runtime and Execution Model
- The runtime target is Node.js, with the executable entrypoint declared in `package.json` as `dist/index.js` and exposed via the `private-journal-mcp` bin.
- `src/index.ts` is a CLI bootstrapper that parses `--journal-path`, resolves a project journal fallback via `src/paths.ts`, logs environment diagnostics to stderr, and starts the MCP server.
- `src/server.ts` runs as a long-lived stdio process using the MCP SDK transport rather than HTTP, so deployment is CLI/process based instead of service/container based.
- The server is state-light in process memory: it keeps a singleton embedding pipeline, a journal manager, and a search service, but persists journal/search state to the filesystem.

## Language and Tooling
- The implementation language is TypeScript, compiled from `src/` into CommonJS output in `dist/`.
- `tsconfig.json` targets `ES2020`, uses `CommonJS`, enables `strict`, `esModuleInterop`, `declaration`, `declarationMap`, and `sourceMap`.
- Linting is configured in `.eslintrc.js` with `@typescript-eslint/parser` and `@typescript-eslint/recommended`.
- Formatting is configured in `.prettierrc` with semicolons, single quotes, `printWidth: 100`, and `tabWidth: 2`.
- Git hygiene is conventional: `.gitignore` excludes `node_modules/`, `dist/`, `coverage/`, logs, `.env`, and editor/system files.

## Direct Dependencies
- `@modelcontextprotocol/sdk` in `package.json` provides the MCP server implementation used by `src/server.ts`.
- `@xenova/transformers` in `package.json` provides local embedding generation for `src/embeddings.ts`.
- `package-lock.json` shows `@xenova/transformers` pulling in `onnxruntime-web`, optional `onnxruntime-node`, and `sharp`, which matter for runtime footprint even though they are not imported directly in repo code.

## Dev Dependencies
- `typescript` drives compilation through `npm run build`.
- `jest`, `ts-jest`, and `@types/jest` power the test runner configured in `jest.config.js`.
- `eslint`, `@typescript-eslint/eslint-plugin`, and `@typescript-eslint/parser` support static analysis.
- `prettier` provides source formatting for `src/**/*.ts`.
- `@types/node` supplies Node type definitions.

## Build, Test, and Dev Commands
- `npm run build`: runs `tsc` and emits production artifacts to `dist/`.
- `npm run dev`: runs `tsc --watch` for iterative TypeScript development.
- `npm start`: executes `node dist/index.js`.
- `npm test`: runs Jest in Node mode.
- `npm run test:watch`: runs Jest watch mode.
- `npm run lint`: lints `src/**/*.ts`.
- `npm run format`: formats `src/**/*.ts`.
- `package.json` also uses `prepare` to build automatically before packaging/install flows.

## Storage and Search Components
- `src/journal.ts` is the write path: it formats markdown entries with YAML frontmatter, creates date-based directories, and writes `.md` files.
- The journal naming convention is `YYYY-MM-DD/HH-MM-SS-ffffff.md`, where the microsecond-like suffix is synthesized from milliseconds plus randomness.
- `src/paths.ts` implements path resolution for project-local storage in ``.private-journal/`` and user-global storage in `~/.private-journal/` with temp-directory fallback.
- `src/embeddings.ts` extracts searchable text from markdown, generates normalized embeddings with the `Xenova/all-MiniLM-L6-v2` model, and writes adjacent `.embedding` JSON files.
- `src/search.ts` loads `.embedding` files, filters by section/date/type, computes cosine similarity in memory, and produces ranked search results or recent-entry listings.
- The effective persistence layer is plain files, not a database: markdown content plus JSON sidecar vectors.

## Protocol and Tool Surface
- `src/server.ts` registers MCP tools over stdio: `process_thoughts`, `search_journal`, `read_journal_entry`, and `list_recent_entries`.
- The code still contains a legacy `process_feelings` call handler in `src/server.ts`, even though it is not listed in the current `ListTools` response.
- Input validation is lightweight and inline in request handlers; there is no separate schema package beyond the MCP SDK request schemas.

## Test and Verification Layout
- Tests live under `tests/` and run in a Node environment per `jest.config.js`.
- `tests/setup.ts` mocks `@xenova/transformers`, avoiding real model initialization during automated tests.
- `tests/journal.test.ts`, `tests/embeddings.test.ts`, and `tests/paths.test.ts` cover filesystem writes, search extraction, embedding behavior, and path fallbacks.
- Coverage collection is focused on `src/journal.ts`, `src/types.ts`, `src/paths.ts`, `src/embeddings.ts`, and `src/search.ts`.

## Key Config Files
- `package.json`: scripts, dependency graph, CLI bin, publishable files.
- `package-lock.json`: exact npm dependency resolution, including transformer runtime subdependencies.
- `tsconfig.json`: compile target and output settings.
- `jest.config.js`: test runner, coverage, setup hooks, timeout.
- `.eslintrc.js`: TypeScript lint policy.
- `.prettierrc`: formatting conventions.
- `README.md`: installation, MCP configuration, tool descriptions, and storage model.
- `docs/spec.md`: earlier product/spec framing; useful for historical context because it still describes the simpler `process_feelings` shape.
