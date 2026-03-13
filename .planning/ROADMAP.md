# Roadmap: Private Journal CLI

## Overview

This roadmap converts the existing private-journal project from an MCP server into a direct CLI without discarding the journal engine already in place. The work starts by replacing the application surface and packaging, then exposes write and retrieval workflows, hardens the output contract for agent use, and finishes by locking the new behavior down with tests and cleanup.

## Phases

- [ ] **Phase 1: CLI Foundation** - Replace the MCP startup path with a direct command-line application surface
- [ ] **Phase 2: Write Commands** - Expose journal writing workflows through CLI subcommands and flags
- [ ] **Phase 3: Retrieval Commands** - Expose search, read, and recent-entry retrieval through CLI subcommands
- [ ] **Phase 4: Agent Output and Migration** - Finalize machine-readable output and protect storage compatibility during the migration
- [ ] **Phase 5: Verification and Cleanup** - Complete CLI-focused test coverage and remove MCP-specific residue

## Phase Details

### Phase 1: CLI Foundation
**Goal**: The package starts as a CLI application instead of an MCP server and advertises itself accordingly.
**Depends on**: Nothing (first phase)
**Requirements**: [CLI-01, CLI-02, MIG-02]
**Success Criteria** (what must be TRUE):
  1. Running the binary shows CLI help or executes a subcommand instead of starting an MCP transport server.
  2. Package metadata, binary naming, and startup messaging identify the tool as a CLI for agents.
  3. The command structure is clear enough that an agent can discover supported operations without reading source files.
**Plans**: 3 plans

Plans:
- [ ] 01-01: Design the CLI command structure and startup contract
- [ ] 01-02: Replace MCP entrypoint wiring with CLI dispatch
- [ ] 01-03: Update package metadata and user-facing documentation strings

### Phase 2: Write Commands
**Goal**: Agents can write both freeform entries and structured thoughts through CLI commands and flags.
**Depends on**: Phase 1
**Requirements**: [WRITE-01, WRITE-02, WRITE-03]
**Success Criteria** (what must be TRUE):
  1. An agent can create a project journal entry from the CLI with supplied content.
  2. An agent can submit structured thought sections from the CLI and they are written to the correct project/user destinations.
  3. Journal path overrides and destination controls work through documented flags.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Implement freeform entry write command
- [ ] 02-02: Implement structured thoughts command and flag parsing
- [ ] 02-03: Wire path and destination overrides into the CLI surface

### Phase 3: Retrieval Commands
**Goal**: Agents can search, read, and list journal entries from the CLI using the existing search stack.
**Depends on**: Phase 2
**Requirements**: [READ-01, READ-02, READ-03]
**Success Criteria** (what must be TRUE):
  1. Natural-language search is available from the CLI and returns relevant entries.
  2. A specific entry can be read by path without manual file navigation.
  3. Recent entries can be listed with useful filters for date range, type, and count.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Implement semantic search command
- [ ] 03-02: Implement entry read command
- [ ] 03-03: Implement recent-entry listing and filter handling

### Phase 4: Agent Output and Migration
**Goal**: The CLI is dependable for agent callers and preserves compatibility with existing journal data.
**Depends on**: Phase 3
**Requirements**: [CLI-03, MIG-01]
**Success Criteria** (what must be TRUE):
  1. Commands can emit stable machine-readable output for agents that need structured parsing.
  2. Existing Markdown entries and `.embedding` files still work with the CLI-based application.
  3. Error messages and exit codes distinguish usage errors from operational failures.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Add machine-readable output and error contract
- [ ] 04-02: Verify compatibility with existing journal and embedding files

### Phase 5: Verification and Cleanup
**Goal**: The new CLI behavior is fully covered and MCP-specific leftovers are removed.
**Depends on**: Phase 4
**Requirements**: [MIG-03]
**Success Criteria** (what must be TRUE):
  1. Automated tests cover the primary CLI write and retrieval workflows.
  2. Existing journaling and search behavior remains green after the interface migration.
  3. Source files, scripts, and package metadata no longer imply MCP support where it has been removed.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Add or update CLI-focused tests
- [ ] 05-02: Remove stale MCP-specific code paths and references

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CLI Foundation | 0/3 | Not started | - |
| 2. Write Commands | 0/3 | Not started | - |
| 3. Retrieval Commands | 0/3 | Not started | - |
| 4. Agent Output and Migration | 0/2 | Not started | - |
| 5. Verification and Cleanup | 0/2 | Not started | - |
