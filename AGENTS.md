# AGENTS.md

This file provides guidance to Codex and other agent runtimes when working with code in this repository.

## Common Development Commands

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Development mode with TypeScript watcher
npm run dev

# Lint the code
npm run lint

# Format the code
npm run format

# Run a single test file
npx jest tests/journal.test.ts
```

## Architecture Overview

This is a local-first CLI (`private-journal`) that gives AI agents and assistants private journaling, structured thought capture, and semantic search capabilities. All processing happens on-device.

**Core Components:**
- `src/index.ts` — CLI entry point; delegates to `runCli()` in `src/cli.ts`
- `src/cli.ts` — Command parser and dispatcher; handles all five commands
- `src/journal.ts` — `JournalManager` class; writes timestamped markdown entries with YAML frontmatter and sidecar embeddings
- `src/embeddings.ts` — `EmbeddingService` singleton; generates 384-dim vectors via `Xenova/all-MiniLM-L6-v2` with hash-based fallback
- `src/search.ts` — `SearchService`; cosine-similarity search across `.embedding` sidecar files
- `src/paths.ts` — Cross-platform path resolution with CWD → HOME → temp fallback
- `src/types.ts` — Shared TypeScript interfaces

**Key Architecture Patterns:**
- **Dual Storage**: `project_notes` → `.private-journal/` in CWD; all other sections → `~/.private-journal/`
- **Timestamped Storage**: `YYYY-MM-DD/HH-MM-SS-μμμμμμ.md` with microsecond precision and random jitter
- **YAML Frontmatter**: Each entry includes `title`, `date` (ISO 8601), and `timestamp` (Unix ms)
- **Sidecar Embeddings**: `.embedding` JSON files sit alongside each `.md` file for fast semantic retrieval
- **`--json` Flag**: All commands emit machine-readable JSON when passed `--json`; exit codes 0/1/2

**CLI Commands:**

| Command | Purpose |
|---------|---------|
| `write` | Freeform project journal entry |
| `thoughts` | Structured sections split between project and user journals |
| `search` | Semantic search via local embeddings |
| `read` | Read a specific entry by path |
| `recent` | List recent entries with optional date/type filter |

## Using the Journal from Agent Code

Always pass `--json` and parse stdout. Example invocations:

```bash
# Capture structured thoughts
private-journal thoughts \
  --project-notes "Discovered issue in auth flow" \
  --technical-insights "Prefer condition-based waiting over sleep" \
  --feelings "Frustrated but making progress" \
  --json

# Search prior context
private-journal search --query "how we handled auth errors" --limit 5 --json

# List recent entries
private-journal recent --days 7 --type both --json
```

JSON exit codes: `0` = success, `1` = usage error, `2` = runtime failure.

## Skill Package

A pre-built agent skill is bundled in `skills/private-journal-cli.skill`.
Install it for Codex, Claude Code, or other agents:

```bash
npx skills add ./skills/private-journal-cli.skill
```

## Testing Approach

- Jest with ts-jest; mocked `@xenova/transformers` for embedding tests
- Temporary directories created and cleaned per test for isolation
- 4 test suites, 33 tests covering: paths, embeddings, CLI commands, journal file operations
- Coverage tracked for `src/journal.ts`, `src/types.ts`, `src/paths.ts`, `src/embeddings.ts`, `src/search.ts`
