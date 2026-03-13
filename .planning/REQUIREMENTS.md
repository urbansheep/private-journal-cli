# Requirements: Private Journal CLI

**Defined:** 2026-03-13
**Core Value:** AI agents can privately record and retrieve journal context through a simple local CLI without MCP transport friction.

## Completion Evidence

- `fc93c5e` (2026-03-13) - converted the MCP runtime to a direct CLI, added command handlers, and added CLI-focused tests
- `1b6473b` (2026-03-13) - archived MCP-era docs and hardened CLI fallback behavior for the converted tool

## v1 Requirements

### CLI Foundation

- [x] **CLI-01**: Agent can invoke a single `private-journal` executable with documented subcommands
- [x] **CLI-02**: Agent can request command usage/help without reading the source code
- [x] **CLI-03**: Agent can receive command results in a stable machine-readable format when requested

### Journal Writing

- [x] **WRITE-01**: Agent can write a freeform journal entry to the project journal from the CLI
- [x] **WRITE-02**: Agent can write structured thought sections (`feelings`, `project_notes`, `user_context`, `technical_insights`, `world_knowledge`) from the CLI
- [x] **WRITE-03**: Agent can control journal destination and path resolution through CLI flags without changing code

### Retrieval

- [x] **READ-01**: Agent can search journal entries semantically from the CLI using natural language queries
- [x] **READ-02**: Agent can read a specific journal entry by file path from the CLI
- [x] **READ-03**: Agent can list recent entries with filters for date window, entry type, and result count

### Migration and Reliability

- [x] **MIG-01**: Existing Markdown journal entries and embedding files remain compatible after the CLI migration
- [x] **MIG-02**: Package metadata, binary name, and startup flow no longer present the app as an MCP server
- [x] **MIG-03**: Automated tests cover the new CLI behavior and protect existing journaling/search behavior from regressions

## v2 Requirements

### Workflow Enhancements

- **FLOW-01**: Agent can run interactive prompts for missing arguments when used by humans directly in a terminal
- **FLOW-02**: Agent can export search results or entries in alternate serialization formats beyond the default CLI contract

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hosted synchronization | Conflicts with the local-first privacy model |
| GUI application | Not required to remove MCP limitations for AI agents |
| Multi-user accounts or permissions | Adds product scope unrelated to the CLI conversion |
| External embedding/search APIs | Local processing is part of the tool's privacy promise |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 4 | Complete |
| WRITE-01 | Phase 2 | Complete |
| WRITE-02 | Phase 2 | Complete |
| WRITE-03 | Phase 2 | Complete |
| READ-01 | Phase 3 | Complete |
| READ-02 | Phase 3 | Complete |
| READ-03 | Phase 3 | Complete |
| MIG-01 | Phase 4 | Complete |
| MIG-02 | Phase 1 | Complete |
| MIG-03 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 12 total
- Complete: 12
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after CLI conversion completion and follow-up swarm pass*
