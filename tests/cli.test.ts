import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function invokeCli(args: string[]): Promise<CliResult> {
  // Intentionally loaded at runtime so the first TDD run fails cleanly if the CLI module does not exist yet.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { runCli } = require('../src/cli');

  let stdout = '';
  let stderr = '';

  const exitCode = await runCli(args, {
    stdout: (message: string) => {
      stdout += message;
    },
    stderr: (message: string) => {
      stderr += message;
    },
  });

  return { exitCode, stdout, stderr };
}

describe('CLI conversion', () => {
  let projectTempDir: string;
  let userTempDir: string;

  beforeEach(async () => {
    projectTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'private-journal-cli-project-'));
    userTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'private-journal-cli-user-'));
  });

  afterEach(async () => {
    await fs.rm(projectTempDir, { recursive: true, force: true });
    await fs.rm(userTempDir, { recursive: true, force: true });
  });

  test('shows help when run without arguments', async () => {
    const result = await invokeCli([]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('private-journal');
    expect(result.stdout).toContain('write');
    expect(result.stdout).toContain('thoughts');
    expect(result.stdout).toContain('search');
    expect(result.stdout).toContain('recent');
    expect(result.stderr).toBe('');
  });

  test('returns an error for an unknown command', async () => {
    const result = await invokeCli(['bogus']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown command');
  });

  test('writes a freeform journal entry and returns JSON metadata', async () => {
    const result = await invokeCli([
      'write',
      '--content',
      'CLI freeform entry',
      '--journal-path',
      projectTempDir,
      '--json',
    ]);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('write');
    expect(payload.entry.path).toMatch(/\.md$/);

    const content = await fs.readFile(payload.entry.path, 'utf8');
    expect(content).toContain('CLI freeform entry');
  });

  test('writes structured thoughts to project and user journals', async () => {
    const result = await invokeCli([
      'thoughts',
      '--project-notes',
      'Project-only note',
      '--feelings',
      'I feel focused',
      '--user-journal-path',
      userTempDir,
      '--journal-path',
      projectTempDir,
      '--json',
    ]);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('thoughts');
    expect(payload.entries.project.path).toMatch(/\.md$/);
    expect(payload.entries.user.path).toMatch(/\.md$/);

    const projectContent = await fs.readFile(payload.entries.project.path, 'utf8');
    const userContent = await fs.readFile(payload.entries.user.path, 'utf8');

    expect(projectContent).toContain('## Project Notes');
    expect(projectContent).not.toContain('## Feelings');
    expect(userContent).toContain('## Feelings');
    expect(userContent).not.toContain('## Project Notes');
  });

  test('supports search, read, and recent commands with JSON output', async () => {
    const writeResult = await invokeCli([
      'thoughts',
      '--technical-insights',
      'Vector embeddings help semantic search',
      '--user-journal-path',
      userTempDir,
      '--journal-path',
      projectTempDir,
      '--json',
    ]);

    const written = JSON.parse(writeResult.stdout);
    const entryPath = written.entries.user.path;

    const searchResult = await invokeCli([
      'search',
      '--query',
      'semantic vectors',
      '--user-journal-path',
      userTempDir,
      '--journal-path',
      projectTempDir,
      '--json',
    ]);
    const searchPayload = JSON.parse(searchResult.stdout);

    expect(searchResult.exitCode).toBe(0);
    expect(searchPayload.ok).toBe(true);
    expect(searchPayload.results.length).toBeGreaterThan(0);
    expect(searchPayload.results[0].path).toBe(entryPath);

    const readResult = await invokeCli(['read', '--path', entryPath, '--json']);
    const readPayload = JSON.parse(readResult.stdout);

    expect(readResult.exitCode).toBe(0);
    expect(readPayload.ok).toBe(true);
    expect(readPayload.entry.path).toBe(entryPath);
    expect(readPayload.entry.content).toContain('Vector embeddings help semantic search');

    const recentResult = await invokeCli([
      'recent',
      '--limit',
      '5',
      '--days',
      '7',
      '--user-journal-path',
      userTempDir,
      '--journal-path',
      projectTempDir,
      '--json',
    ]);
    const recentPayload = JSON.parse(recentResult.stdout);

    expect(recentResult.exitCode).toBe(0);
    expect(recentPayload.ok).toBe(true);
    expect(recentPayload.results.length).toBeGreaterThan(0);
    expect(recentPayload.results[0].path).toBe(entryPath);
  });

  test('keeps thoughts, search, and recent usable when transformers are unavailable', async () => {
    jest.resetModules();

    const transformers = jest.requireMock('@xenova/transformers') as {
      pipeline: jest.Mock;
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    transformers.pipeline.mockRejectedValueOnce(new Error('offline'));

    try {
      const thoughtsResult = await invokeCli([
        'thoughts',
        '--technical-insights',
        'Vector embeddings help semantic search',
        '--user-journal-path',
        userTempDir,
        '--journal-path',
        projectTempDir,
        '--json',
      ]);

      expect(thoughtsResult.exitCode).toBe(0);

      const thoughtsPayload = JSON.parse(thoughtsResult.stdout);
      const entryPath = thoughtsPayload.entries.user.path;

      const searchResult = await invokeCli([
        'search',
        '--query',
        'semantic vectors',
        '--user-journal-path',
        userTempDir,
        '--journal-path',
        projectTempDir,
        '--json',
      ]);

      expect(searchResult.exitCode).toBe(0);

      const searchPayload = JSON.parse(searchResult.stdout);
      expect(searchPayload.results).toHaveLength(1);
      expect(searchPayload.results[0].path).toBe(entryPath);

      const recentResult = await invokeCli([
        'recent',
        '--days',
        '7',
        '--limit',
        '5',
        '--user-journal-path',
        userTempDir,
        '--journal-path',
        projectTempDir,
        '--json',
      ]);

      expect(recentResult.exitCode).toBe(0);

      const recentPayload = JSON.parse(recentResult.stdout);
      expect(recentPayload.results).toHaveLength(1);
      expect(recentPayload.results[0].path).toBe(entryPath);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      transformers.pipeline.mockReset();
      transformers.pipeline.mockResolvedValue(
        jest.fn().mockResolvedValue({
          data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
        })
      );
    }
  });

  test('package metadata no longer advertises MCP', async () => {
    const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8'));

    expect(packageJson.name).toBe('private-journal-cli');
    expect(Object.keys(packageJson.bin)).toEqual(['private-journal']);
    expect(packageJson.description.toLowerCase()).not.toContain('mcp');
    expect(JSON.stringify(packageJson.dependencies || {})).not.toContain('@modelcontextprotocol/sdk');
  });
});
