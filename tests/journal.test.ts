// ABOUTME: Unit tests for journal writing functionality
// ABOUTME: Tests file system operations, timestamps, formatting, and embedding sidecars

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { JournalManager } from '../src/journal';

function getFormattedDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMarkdownFile(files: string[]): string {
  const match = files.find((file) => file.endsWith('.md'));
  if (!match) {
    throw new Error(`No markdown file found in ${files.join(', ')}`);
  }
  return match;
}

describe('JournalManager', () => {
  let projectTempDir: string;
  let userTempDir: string;
  let journalManager: JournalManager;
  let originalHome: string | undefined;

  beforeEach(async () => {
    projectTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-project-test-'));
    userTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-user-test-'));

    originalHome = process.env.HOME;
    process.env.HOME = userTempDir;

    journalManager = new JournalManager(projectTempDir);
  });

  afterEach(async () => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }

    await fs.rm(projectTempDir, { recursive: true, force: true });
    await fs.rm(userTempDir, { recursive: true, force: true });
  });

  test('writes journal entry to correct file structure', async () => {
    await journalManager.writeEntry('This is a test journal entry.');

    const dayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const files = await fs.readdir(dayDir);

    expect(files).toHaveLength(2);
    expect(files.find((file) => file.endsWith('.md'))).toBeDefined();
    expect(files.find((file) => file.endsWith('.embedding'))).toBeDefined();
    expect(getMarkdownFile(files)).toMatch(/^\d{2}-\d{2}-\d{2}-\d{6}\.md$/);
  });

  test('creates directory structure automatically', async () => {
    await journalManager.writeEntry('Test entry');

    const dayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const stats = await fs.stat(dayDir);

    expect(stats.isDirectory()).toBe(true);
  });

  test('formats entry content correctly', async () => {
    const content = 'This is my journal entry content.';
    await journalManager.writeEntry(content);

    const dayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const fileContent = await fs.readFile(path.join(dayDir, getMarkdownFile(await fs.readdir(dayDir))), 'utf8');

    expect(fileContent).toContain('---');
    expect(fileContent).toContain('title: "');
    expect(fileContent).toContain('date: ');
    expect(fileContent).toContain('timestamp: ');
    expect(fileContent).toContain(' - ');
    expect(fileContent).toContain(content);

    const lines = fileContent.split('\n');
    expect(lines[0]).toBe('---');
    expect(lines[1]).toMatch(/^title: ".*"$/);
    expect(lines[2]).toMatch(/^date: \d{4}-\d{2}-\d{2}T/);
    expect(lines[3]).toMatch(/^timestamp: \d+$/);
    expect(lines[4]).toBe('---');
    expect(lines[5]).toBe('');
    expect(lines[6]).toBe(content);
  });

  test('handles multiple entries on same day', async () => {
    await journalManager.writeEntry('First entry');
    await journalManager.writeEntry('Second entry');

    const dayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const files = await fs.readdir(dayDir);
    const mdFiles = files.filter((file) => file.endsWith('.md'));

    expect(files).toHaveLength(4);
    expect(mdFiles).toHaveLength(2);
    expect(mdFiles[0]).not.toEqual(mdFiles[1]);
  });

  test('handles empty content without creating an embedding sidecar', async () => {
    await journalManager.writeEntry('');

    const dayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const files = await fs.readdir(dayDir);
    const fileContent = await fs.readFile(path.join(dayDir, getMarkdownFile(files)), 'utf8');

    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.md$/);
    expect(fileContent).toContain('---');
    expect(fileContent).toContain('title: "');
    expect(fileContent).toContain(' - ');
    expect(fileContent).toMatch(/date: \d{4}-\d{2}-\d{2}T/);
    expect(fileContent).toMatch(/timestamp: \d+/);
  });

  test('handles large content', async () => {
    const content = 'A'.repeat(10000);
    await journalManager.writeEntry(content);

    const dayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const files = await fs.readdir(dayDir);
    const fileContent = await fs.readFile(path.join(dayDir, getMarkdownFile(files)), 'utf8');

    expect(fileContent).toContain(content);
  });

  test('writes project notes to project directory with an embedding sidecar', async () => {
    await journalManager.writeThoughts({ project_notes: 'The architecture is solid' });

    const projectDayDir = path.join(projectTempDir, getFormattedDate(new Date()));
    const projectFiles = await fs.readdir(projectDayDir);
    const projectContent = await fs.readFile(path.join(projectDayDir, getMarkdownFile(projectFiles)), 'utf8');

    expect(projectFiles).toHaveLength(2);
    expect(projectFiles.find((file) => file.endsWith('.embedding'))).toBeDefined();
    expect(projectContent).toContain('## Project Notes');
    expect(projectContent).toContain('The architecture is solid');
    expect(projectContent).not.toContain('## Feelings');
  });

  test('writes user thoughts to user directory with an embedding sidecar', async () => {
    await journalManager.writeThoughts({
      feelings: 'I feel great about this feature',
      technical_insights: 'TypeScript interfaces are powerful',
    });

    const userDayDir = path.join(userTempDir, '.private-journal', getFormattedDate(new Date()));
    const userFiles = await fs.readdir(userDayDir);
    const userContent = await fs.readFile(path.join(userDayDir, getMarkdownFile(userFiles)), 'utf8');

    expect(userFiles).toHaveLength(2);
    expect(userFiles.find((file) => file.endsWith('.embedding'))).toBeDefined();
    expect(userContent).toContain('## Feelings');
    expect(userContent).toContain('I feel great about this feature');
    expect(userContent).toContain('## Technical Insights');
    expect(userContent).toContain('TypeScript interfaces are powerful');
    expect(userContent).not.toContain('## Project Notes');
  });

  test('splits thoughts between project and user directories', async () => {
    await journalManager.writeThoughts({
      feelings: 'I feel great',
      project_notes: 'The architecture is solid',
      user_context: 'Jesse prefers simple solutions',
      technical_insights: 'TypeScript is powerful',
      world_knowledge: 'Git workflows matter',
    });

    const dateString = getFormattedDate(new Date());
    const projectDayDir = path.join(projectTempDir, dateString);
    const userDayDir = path.join(userTempDir, '.private-journal', dateString);

    const projectFiles = await fs.readdir(projectDayDir);
    const userFiles = await fs.readdir(userDayDir);
    const projectContent = await fs.readFile(path.join(projectDayDir, getMarkdownFile(projectFiles)), 'utf8');
    const userContent = await fs.readFile(path.join(userDayDir, getMarkdownFile(userFiles)), 'utf8');

    expect(projectFiles).toHaveLength(2);
    expect(userFiles).toHaveLength(2);
    expect(projectContent).toContain('## Project Notes');
    expect(projectContent).not.toContain('## Feelings');
    expect(userContent).toContain('## Feelings');
    expect(userContent).toContain('## User Context');
    expect(userContent).toContain('## Technical Insights');
    expect(userContent).toContain('## World Knowledge');
    expect(userContent).not.toContain('## Project Notes');
  });

  test('handles thoughts with only user sections', async () => {
    await journalManager.writeThoughts({ world_knowledge: 'Learned something interesting about databases' });

    const dateString = getFormattedDate(new Date());
    const userDayDir = path.join(userTempDir, '.private-journal', dateString);
    const userFiles = await fs.readdir(userDayDir);
    const userContent = await fs.readFile(path.join(userDayDir, getMarkdownFile(userFiles)), 'utf8');

    expect(userFiles).toHaveLength(2);
    expect(userContent).toContain('## World Knowledge');
    expect(userContent).toContain('Learned something interesting about databases');

    await expect(fs.access(path.join(projectTempDir, dateString))).rejects.toThrow();
  });

  test('handles thoughts with only project sections', async () => {
    await journalManager.writeThoughts({ project_notes: 'This specific codebase pattern works well' });

    const dateString = getFormattedDate(new Date());
    const projectDayDir = path.join(projectTempDir, dateString);
    const projectFiles = await fs.readdir(projectDayDir);
    const projectContent = await fs.readFile(path.join(projectDayDir, getMarkdownFile(projectFiles)), 'utf8');

    expect(projectFiles).toHaveLength(2);
    expect(projectContent).toContain('## Project Notes');
    expect(projectContent).toContain('This specific codebase pattern works well');

    await expect(fs.access(path.join(userTempDir, '.private-journal', dateString))).rejects.toThrow();
  });

  test('uses explicit user journal path when provided', async () => {
    const customUserDir = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-user-'));
    const customJournalManager = new JournalManager(projectTempDir, customUserDir);

    try {
      await customJournalManager.writeThoughts({ feelings: 'Testing custom path' });

      const customDayDir = path.join(customUserDir, getFormattedDate(new Date()));
      const customFiles = await fs.readdir(customDayDir);
      const customContent = await fs.readFile(path.join(customDayDir, getMarkdownFile(customFiles)), 'utf8');

      expect(customFiles).toHaveLength(2);
      expect(customContent).toContain('Testing custom path');
    } finally {
      await fs.rm(customUserDir, { recursive: true, force: true });
    }
  });
});
