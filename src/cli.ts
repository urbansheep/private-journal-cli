// ABOUTME: Command-line interface for the private journal tool
// ABOUTME: Parses agent-friendly subcommands and emits text or JSON responses

import * as path from 'path';
import { JournalManager } from './journal';
import { resolveProjectJournalPath, resolveUserJournalPath } from './paths';
import { SearchService } from './search';
import { ThoughtSections } from './types';

export interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

type ParsedArgs = {
  command?: string;
  options: Record<string, string | boolean>;
};

class CliUsageError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

const HELP_TEXT = `private-journal

Usage:
  private-journal <command> [options]

Commands:
  help                      Show this help text
  write                     Write a freeform project journal entry
  thoughts                  Write structured thoughts to project/user journals
  search                    Search journal entries semantically
  read                      Read a specific journal entry by path
  recent                    List recent journal entries

Global patterns:
  --json                    Emit machine-readable JSON output
  --journal-path PATH       Override the project journal path
  --user-journal-path PATH  Override the user journal path
`;

export async function runCli(args: string[], io: CliIo = defaultIo()): Promise<number> {
  try {
    const parsed = parseArgs(args);

    if (!parsed.command || parsed.command === 'help' || parsed.options.help === true) {
      writeLine(io.stdout, HELP_TEXT);
      return 0;
    }

    switch (parsed.command) {
      case 'write':
        await handleWrite(parsed.options, io);
        return 0;
      case 'thoughts':
        await handleThoughts(parsed.options, io);
        return 0;
      case 'search':
        await handleSearch(parsed.options, io);
        return 0;
      case 'read':
        await handleRead(parsed.options, io);
        return 0;
      case 'recent':
        await handleRecent(parsed.options, io);
        return 0;
      default:
        throw new CliUsageError(`Unknown command: ${parsed.command}`);
    }
  } catch (error) {
    if (error instanceof CliUsageError) {
      writeLine(io.stderr, error.message);
      return error.exitCode;
    }

    const message = error instanceof Error ? error.message : String(error);
    writeLine(io.stderr, message);
    return 2;
  }
}

function parseArgs(args: string[]): ParsedArgs {
  if (args.length === 0) {
    return { options: {} };
  }

  const [command, ...rest] = args;
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      throw new CliUsageError(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = rest[index + 1];

    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, options };
}

async function handleWrite(options: Record<string, string | boolean>, io: CliIo): Promise<void> {
  const content = requireString(options, 'content');
  const manager = new JournalManager(resolveProjectPath(options), resolveUserPath(options));
  const entry = await manager.writeEntry(content);

  emit(
    io,
    options,
    {
      ok: true,
      command: 'write',
      entry,
    },
    `Recorded project journal entry: ${entry.path}`
  );
}

async function handleThoughts(options: Record<string, string | boolean>, io: CliIo): Promise<void> {
  const thoughts: ThoughtSections = {
    feelings: getOptionalString(options, 'feelings'),
    project_notes: getOptionalString(options, 'project-notes'),
    user_context: getOptionalString(options, 'user-context'),
    technical_insights: getOptionalString(options, 'technical-insights'),
    world_knowledge: getOptionalString(options, 'world-knowledge'),
  };

  if (!Object.values(thoughts).some((value) => value)) {
    throw new CliUsageError('At least one structured thought field is required');
  }

  const manager = new JournalManager(resolveProjectPath(options), resolveUserPath(options));
  const entries = await manager.writeThoughts(thoughts);

  emit(
    io,
    options,
    {
      ok: true,
      command: 'thoughts',
      entries,
    },
    formatThoughtsSummary(entries)
  );
}

async function handleSearch(options: Record<string, string | boolean>, io: CliIo): Promise<void> {
  const query = requireString(options, 'query');
  const service = new SearchService(resolveProjectPath(options), resolveUserPath(options));
  const results = await service.search(query, {
    limit: getNumber(options, 'limit', 10),
    type: getEntryType(options),
    sections: getSections(options),
  });

  emit(
    io,
    options,
    {
      ok: true,
      command: 'search',
      results,
    },
    formatSearchSummary(results)
  );
}

async function handleRead(options: Record<string, string | boolean>, io: CliIo): Promise<void> {
  const entryPath = requireString(options, 'path');
  const service = new SearchService(resolveProjectPath(options), resolveUserPath(options));
  const content = await service.readEntry(entryPath);

  if (content === null) {
    throw new Error(`Entry not found: ${entryPath}`);
  }

  emit(
    io,
    options,
    {
      ok: true,
      command: 'read',
      entry: {
        path: entryPath,
        content,
      },
    },
    content
  );
}

async function handleRecent(options: Record<string, string | boolean>, io: CliIo): Promise<void> {
  const days = getNumber(options, 'days', 30);
  const limit = getNumber(options, 'limit', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const service = new SearchService(resolveProjectPath(options), resolveUserPath(options));
  const results = await service.listRecent({
    limit,
    type: getEntryType(options),
    dateRange: { start: startDate },
  });

  emit(
    io,
    options,
    {
      ok: true,
      command: 'recent',
      results,
    },
    formatRecentSummary(results, days)
  );
}

function requireString(options: Record<string, string | boolean>, key: string): string {
  const value = options[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new CliUsageError(`Missing required option: --${key}`);
  }
  return value;
}

function getOptionalString(
  options: Record<string, string | boolean>,
  key: string
): string | undefined {
  const value = options[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(
  options: Record<string, string | boolean>,
  key: string,
  defaultValue: number
): number {
  const value = options[key];
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string') {
    throw new CliUsageError(`Option --${key} requires a numeric value`);
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new CliUsageError(`Option --${key} must be a number`);
  }

  return parsed;
}

function getEntryType(options: Record<string, string | boolean>): 'project' | 'user' | 'both' {
  const value = options.type;
  if (value === undefined) {
    return 'both';
  }

  if (value === 'project' || value === 'user' || value === 'both') {
    return value;
  }

  throw new CliUsageError('Option --type must be one of: project, user, both');
}

function getSections(options: Record<string, string | boolean>): string[] | undefined {
  const value = options.sections;
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return value
    .split(',')
    .map((section) => section.trim())
    .filter(Boolean);
}

function resolveProjectPath(options: Record<string, string | boolean>): string {
  const override = getOptionalString(options, 'journal-path');
  return override ? path.resolve(override) : resolveProjectJournalPath();
}

function resolveUserPath(options: Record<string, string | boolean>): string {
  const override = getOptionalString(options, 'user-journal-path');
  return override ? path.resolve(override) : resolveUserJournalPath();
}

function emit(
  io: CliIo,
  options: Record<string, string | boolean>,
  payload: unknown,
  text: string
): void {
  if (options.json === true) {
    writeLine(io.stdout, JSON.stringify(payload));
    return;
  }

  writeLine(io.stdout, text);
}

function formatThoughtsSummary(entries: {
  project?: { path: string };
  user?: { path: string };
}): string {
  const lines = ['Recorded structured thoughts:'];
  if (entries.project) {
    lines.push(`project: ${entries.project.path}`);
  }
  if (entries.user) {
    lines.push(`user: ${entries.user.path}`);
  }
  return lines.join('\n');
}

function formatSearchSummary(results: Array<{ path: string; score: number }>): string {
  if (results.length === 0) {
    return 'No relevant entries found.';
  }

  return [
    'Search results:',
    ...results.map((result, index) => `${index + 1}. ${result.path} (${result.score.toFixed(3)})`),
  ].join('\n');
}

function formatRecentSummary(results: Array<{ path: string }>, days: number): string {
  if (results.length === 0) {
    return `No entries found in the last ${days} days.`;
  }

  return [
    `Recent entries from the last ${days} days:`,
    ...results.map((result) => result.path),
  ].join('\n');
}

function writeLine(writer: (message: string) => void, message: string): void {
  writer(message.endsWith('\n') ? message : `${message}\n`);
}

function defaultIo(): CliIo {
  return {
    stdout: (message: string) => process.stdout.write(message),
    stderr: (message: string) => process.stderr.write(message),
  };
}
