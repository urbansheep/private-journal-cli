# CLI Conversion Design

## Context

This repository already contains the journal-writing, path-resolution, embedding, and search logic needed for a private journal tool. The current limitation is the MCP transport layer: the application starts as an MCP server, which makes direct use by many AI agents and assistants awkward or impossible.

## Goal

Convert the app into a direct CLI that AI agents can invoke locally while preserving the current journal storage format, semantic search behavior, and privacy model.

## Considered Approaches

### 1. Subcommands with an internal dispatcher (recommended)

Implement a small CLI dispatcher in-repo and expose explicit verbs such as `write`, `thoughts`, `search`, `read`, and `recent`, plus `--json` for structured output.

Pros:
- No new runtime dependency
- Clear discoverability through command help
- Easy to test by calling a shared dispatcher function
- Fits the small size of the current codebase

Cons:
- Manual argument parsing needs careful tests

### 2. Add a CLI framework

Adopt a package such as `commander` or `yargs` to handle parsing and help text.

Pros:
- Faster help/flag ergonomics
- Less custom parsing logic

Cons:
- Adds dependency and migration surface
- Unnecessary for the current command set size

### 3. Single command with action flags

Use one command and switch behavior via flags such as `--write` or `--search`.

Pros:
- Small parser surface

Cons:
- Weaker help UX
- Lower discoverability
- Easier for agents to mis-specify combinations

## Chosen Design

### Architecture

Keep the existing domain modules as the execution core:
- `src/journal.ts`
- `src/search.ts`
- `src/embeddings.ts`
- `src/paths.ts`

Add a new CLI module that:
- parses arguments
- dispatches commands
- formats results as text or JSON
- maps operational failures to non-zero exit codes

Make `src/index.ts` a thin wrapper around the CLI module.

### Command Surface

Primary subcommands:
- `write`
- `thoughts`
- `search`
- `read`
- `recent`
- `help`

Cross-cutting flags:
- `--json`
- journal path overrides
- result limits and filtering flags where relevant

### Output Contract

Default output remains human-readable.

When `--json` is present, commands return stable machine-readable objects so AI agents can parse them reliably.

### Migration Rules

- Remove MCP startup behavior and package identity
- Preserve Markdown entry and `.embedding` compatibility
- Reuse existing journaling/search logic instead of rewriting it

### Testing Strategy

Use TDD for the new CLI behavior:
- dispatcher/help tests first
- command behavior tests next
- regression tests to preserve existing storage and search behavior

## Success Criteria

- The binary behaves like a CLI instead of an MCP server
- Agents can write, search, read, and list entries directly
- Existing journal data remains usable
- Tests cover the CLI surface and legacy core behavior
