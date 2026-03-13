# Private Journal CLI

A local-first CLI for AI agents and assistants to write private journal entries, capture structured thoughts, and search prior notes with local semantic embeddings.

## Features

### Journaling
- **Freeform entries**: Write plain project journal entries from the CLI
- **Structured thoughts**: Capture `feelings`, `project_notes`, `user_context`, `technical_insights`, and `world_knowledge`
- **Dual storage**: Project notes stay with the repo, personal notes live in the user journal
- **Timestamped Markdown**: Entries use YAML frontmatter and microsecond-style filenames

### Retrieval
- **Semantic search**: Query prior entries with natural language
- **Read by path**: Open a full entry directly from search results
- **Recent listing**: Browse recent entries by time window, scope, and limit
- **JSON output**: Add `--json` for machine-readable command results

### Privacy
- **Local-only processing**: Journal writes, embeddings, and search stay on your machine
- **No hosted API dependency**: Uses `@xenova/transformers` locally for embeddings
- **Path fallbacks**: Works in project-local or user-level journal locations

## Installation

Run directly from GitHub with `npx`, or install globally if you prefer:

```bash
npx github:obra/private-journal-cli help
```

```bash
npm install -g github:obra/private-journal-cli
private-journal help
```

## Usage

### Show help

```bash
private-journal help
```

### Write a freeform entry

```bash
private-journal write \
  --content "I finally untangled the TypeScript build issue" \
  --json
```

### Write structured thoughts

```bash
private-journal thoughts \
  --project-notes "The CLI dispatcher should stay dependency-free" \
  --technical-insights "Command handlers are easier to test than process wrappers" \
  --feelings "Relieved that the transport migration is small" \
  --json
```

### Search journal entries

```bash
private-journal search \
  --query "times I was frustrated with TypeScript" \
  --type both \
  --limit 5 \
  --json
```

### Read a specific entry

```bash
private-journal read \
  --path /absolute/path/to/.private-journal/2026-03-13/14-30-45-123456.md \
  --json
```

### List recent entries

```bash
private-journal recent \
  --days 7 \
  --limit 10 \
  --type both \
  --json
```

## Command Reference

### `write`
Write a freeform project journal entry.

Options:
- `--content <text>`: Entry body
- `--journal-path <path>`: Override the project journal root
- `--user-journal-path <path>`: Override the user journal root
- `--json`: Emit JSON output

### `thoughts`
Write structured thought sections. `project_notes` go to the project journal. The other sections go to the user journal.

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

## File Structure

### Project Journal

```text
.private-journal/
├── 2026-03-13/
│   ├── 14-30-45-123456.md
│   ├── 14-30-45-123456.embedding
│   └── ...
```

### User Journal

```text
~/.private-journal/
├── 2026-03-13/
│   ├── 14-32-15-789012.md
│   ├── 14-32-15-789012.embedding
│   └── ...
```

### Entry Format

```markdown
---
title: "2:30:45 PM - March 13, 2026"
date: 2026-03-13T14:30:45.123Z
timestamp: 1773412245123
---

## Technical Insights

Command handlers are easier to test than transport-specific wrappers.
```

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
