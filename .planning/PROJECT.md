# Private Journal CLI

## What This Is

Private Journal CLI is a local-first command-line tool that lets AI agents and assistants write private journal entries and retrieve prior context without going through the MCP protocol. It preserves the existing journal storage, sectioned thought capture, and semantic search capabilities, but exposes them as direct commands that can run from any agent runtime able to execute a local binary.

## Core Value

AI agents can privately record and retrieve journal context through a simple local CLI without MCP transport friction.

## Requirements

### Validated

- ✓ Project-local journal entries are stored as timestamped Markdown files with YAML frontmatter — existing codebase
- ✓ Personal and project notes can be split into separate storage roots — existing codebase
- ✓ Journal entries can be searched semantically using local embeddings — existing codebase
- ✓ Specific entries can be read back by file path and recent entries can be listed chronologically — existing codebase

### Active

- [ ] Replace the MCP server interface with a direct CLI interface for AI agents and assistants
- [ ] Preserve the existing local journal format and semantic search behavior during the transport migration
- [ ] Make command results easy for agents to consume in both human-readable and machine-readable forms

### Out of Scope

- Hosted sync or multi-user sharing — this tool remains private and local-first
- GUI or desktop application packaging — the immediate goal is a dependable CLI for agent runtimes
- Remote API dependencies for journaling or search — privacy and offline operation remain core constraints

## Context

This repository is a brownfield Node.js and TypeScript project that currently ships as an MCP server through `src/index.ts` and `src/server.ts`. The journaling, filesystem layout, embedding generation, and search logic already exist in reusable modules such as `src/journal.ts`, `src/search.ts`, `src/embeddings.ts`, and `src/paths.ts`. The requested work is a transport/interface conversion: keep the journal engine and storage behavior, but replace the MCP server surface with a direct command-line interface that AI agents can invoke without MCP limitations.

## Constraints

- **Tech stack**: Keep the project in Node.js and TypeScript — the existing code, tests, and packaging already depend on that stack
- **Privacy**: All journal writes, reads, and semantic search must stay local — the tool is explicitly private-first
- **Compatibility**: Preserve the current journal directory layout and file format where possible — existing entries and embeddings should remain usable
- **Brownfield scope**: Reuse and reshape existing modules instead of rebuilding journaling/search from scratch — the repo already contains the core domain logic

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Convert from MCP server to direct CLI | MCP is the current adoption bottleneck for AI agent usage | - Pending |
| Preserve Markdown + embedding storage layout | Existing data should remain usable after transport migration | - Pending |
| Favor agent-friendly CLI output contracts | The new primary callers are AI agents and assistants, not MCP clients | - Pending |

---
*Last updated: 2026-03-13 after initialization*
