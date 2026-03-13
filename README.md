# Private Journal CLI

`private-journal-cli` publishes the `private-journal` command.

It is a local-first CLI for AI agents and assistants to write private journal entries, capture structured thoughts, and search prior notes with local semantic embeddings.

## Highlights

- Local-only journaling and search
- Project and user journals kept separate by default
- Timestamped Markdown entries with YAML frontmatter
- Sidecar `.embedding` files for semantic retrieval
- `--json` output for automation and agent workflows

## Installation

Install from npm:

```bash
npm install --global private-journal-cli
private-journal help
```

Run without a global install:

```bash
npx private-journal-cli help
```

Use from a local clone before publishing:

```bash
npm install
npm run build
npm link
private-journal help
```

## Quick Start

Write a freeform project journal entry:

```bash
private-journal write \
  --content "I finally untangled the TypeScript build issue" \
  --json
```

Capture structured thoughts. `--project-notes` is written to the project journal; the other sections go to the user journal:

```bash
private-journal thoughts \
  --project-notes "The CLI dispatcher should stay dependency-free" \
  --technical-insights "Command handlers are easier to test than process wrappers" \
  --feelings "Relieved that the transport migration is small" \
  --json
```

Search across project and user journals:

```bash
private-journal search \
  --query "times I was frustrated with TypeScript" \
  --type both \
  --limit 5 \
  --json
```

Read a specific entry by path:

```bash
private-journal read \
  --path /absolute/path/to/.private-journal/2026-03-13/14-30-45-123456.md \
  --json
```

List recent entries:

```bash
private-journal recent \
  --days 7 \
  --limit 10 \
  --type both \
  --json
```

## Storage Model

- Project entries default to `.private-journal/` in the current working directory when that location is usable.
- User entries default to `~/.private-journal/`.
- Override either location with `--journal-path <path>` or `--user-journal-path <path>`.
- Search and recent listing read from both journals by default.

Example layout:

```text
.private-journal/
  2026-03-13/
    14-30-45-123456.md
    14-30-45-123456.embedding

~/.private-journal/
  2026-03-13/
    14-32-15-789012.md
    14-32-15-789012.embedding
```

Each entry is stored as Markdown with YAML frontmatter:

```markdown
---
title: "2:30:45 PM - March 13, 2026"
date: 2026-03-13T14:30:45.123Z
timestamp: 1773412245123
---

## Technical Insights

Command handlers are easier to test than transport-specific wrappers.
```

## Command Reference

### `write`

Write a freeform project journal entry.

Options:
- `--content <text>` entry body
- `--journal-path <path>` override the project journal root
- `--user-journal-path <path>` override the user journal root
- `--json` emit JSON output

### `thoughts`

Write structured thought sections. `project_notes` is stored in the project journal. `feelings`, `user_context`, `technical_insights`, and `world_knowledge` are stored in the user journal.

Options:
- `--feelings <text>`
- `--project-notes <text>`
- `--user-context <text>`
- `--technical-insights <text>`
- `--world-knowledge <text>`
- `--journal-path <path>`
- `--user-journal-path <path>`
- `--json`

### `search`

Search entries semantically.

Options:
- `--query <text>`
- `--limit <number>`
- `--type project|user|both`
- `--sections section1,section2`
- `--journal-path <path>`
- `--user-journal-path <path>`
- `--json`

### `read`

Read an entry by path.

Options:
- `--path <absolute-or-relative-path>`
- `--json`

### `recent`

List recent entries.

Options:
- `--days <number>`
- `--limit <number>`
- `--type project|user|both`
- `--journal-path <path>`
- `--user-journal-path <path>`
- `--json`

## Output and Exit Codes

- Add `--json` to any command for machine-readable output.
- Exit code `0` means success.
- Exit code `1` means CLI usage or validation error.
- Exit code `2` means an unexpected runtime failure.

## Development

```bash
npm run build
npm test
npm run dev
```

## Author

Jesse Vincent <jesse@fsck.com>

## License

MIT
