# Roadmap: Private Journal CLI

## Overview

This roadmap is complete. The MCP runtime was replaced with a direct CLI in `fc93c5e` on 2026-03-13, and the follow-up swarm pass in `1b6473b` on 2026-03-13 archived MCP-era docs and hardened CLI fallback behavior while keeping the CLI-first direction intact.

## Phases

- [x] **Phase 1: CLI Foundation** - Replace the MCP startup path with a direct command-line application surface
- [x] **Phase 2: Write Commands** - Expose journal writing workflows through CLI subcommands and flags
- [x] **Phase 3: Retrieval Commands** - Expose search, read, and recent-entry retrieval through CLI subcommands
- [x] **Phase 4: Agent Output and Migration** - Finalize machine-readable output and protect storage compatibility during the migration
- [x] **Phase 5: Verification and Cleanup** - Complete CLI-focused test coverage and remove MCP-specific residue

## Phase Details

### Phase 1: CLI Foundation
**Goal**: The package starts as a CLI application instead of an MCP server and advertises itself accordingly.
**Depends on**: Nothing (first phase)
**Requirements**: [CLI-01, CLI-02, MIG-02]
**Success Criteria** (what must be TRUE):
  1. Running the binary shows CLI help or executes a subcommand instead of starting an MCP transport server.
  2. Package metadata, binary naming, and startup messaging identify the tool as a CLI for agents.
  3. The command structure is clear enough that an agent can discover supported operations without reading source files.
**Completed**: 2026-03-13 via `fc93c5e`
**Plans**: 3 complete

Plans:
- [x] 01-01: Design the CLI command structure and startup contract
- [x] 01-02: Replace MCP entrypoint wiring with CLI dispatch
- [x] 01-03: Update package metadata and user-facing documentation strings

### Phase 2: Write Commands
**Goal**: Agents can write both freeform entries and structured thoughts through CLI commands and flags.
**Depends on**: Phase 1
**Requirements**: [WRITE-01, WRITE-02, WRITE-03]
**Success Criteria** (what must be TRUE):
  1. An agent can create a project journal entry from the CLI with supplied content.
  2. An agent can submit structured thought sections from the CLI and they are written to the correct project/user destinations.
  3. Journal path overrides and destination controls work through documented flags.
**Completed**: 2026-03-13 via `fc93c5e`
**Plans**: 3 complete

Plans:
- [x] 02-01: Implement freeform entry write command
- [x] 02-02: Implement structured thoughts command and flag parsing
- [x] 02-03: Wire path and destination overrides into the CLI surface

### Phase 3: Retrieval Commands
**Goal**: Agents can search, read, and list journal entries from the CLI using the existing search stack.
**Depends on**: Phase 2
**Requirements**: [READ-01, READ-02, READ-03]
**Success Criteria** (what must be TRUE):
  1. Natural-language search is available from the CLI and returns relevant entries.
  2. A specific entry can be read by path without manual file navigation.
  3. Recent entries can be listed with useful filters for date range, type, and count.
**Completed**: 2026-03-13 via `fc93c5e`
**Plans**: 3 complete

Plans:
- [x] 03-01: Implement semantic search command
- [x] 03-02: Implement entry read command
- [x] 03-03: Implement recent-entry listing and filter handling

### Phase 4: Agent Output and Migration
**Goal**: The CLI is dependable for agent callers and preserves compatibility with existing journal data.
**Depends on**: Phase 3
**Requirements**: [CLI-03, MIG-01]
**Success Criteria** (what must be TRUE):
  1. Commands can emit stable machine-readable output for agents that need structured parsing.
  2. Existing Markdown entries and `.embedding` files still work with the CLI-based application.
  3. Error messages and exit codes distinguish usage errors from operational failures.
**Completed**: 2026-03-13 via `fc93c5e`, reinforced by `1b6473b`
**Plans**: 2 complete

Plans:
- [x] 04-01: Add machine-readable output and error contract
- [x] 04-02: Verify compatibility with existing journal and embedding files

### Phase 5: Verification and Cleanup
**Goal**: The new CLI behavior is fully covered and MCP-specific leftovers are removed.
**Depends on**: Phase 4
**Requirements**: [MIG-03]
**Success Criteria** (what must be TRUE):
  1. Automated tests cover the primary CLI write and retrieval workflows.
  2. Existing journaling and search behavior remains green after the interface migration.
  3. Source files, scripts, and package metadata no longer imply MCP support where it has been removed.
**Completed**: 2026-03-13 via `fc93c5e`, reinforced by `1b6473b`
**Plans**: 2 complete

Plans:
- [x] 05-01: Add or update CLI-focused tests
- [x] 05-02: Remove stale MCP-specific code paths and references

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CLI Foundation | 3/3 | Complete | 2026-03-13 |
| 2. Write Commands | 3/3 | Complete | 2026-03-13 |
| 3. Retrieval Commands | 3/3 | Complete | 2026-03-13 |
| 4. Agent Output and Migration | 2/2 | Complete | 2026-03-13 |
| 5. Verification and Cleanup | 2/2 | Complete | 2026-03-13 |

**Overall status:** 13/13 plans complete. Roadmap closed on 2026-03-13.
