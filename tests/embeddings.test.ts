// ABOUTME: Unit tests for embedding functionality and search capabilities
// ABOUTME: Tests embedding generation, storage, and search operations under mocked embeddings

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { EmbeddingService } from '../src/embeddings';
import { SearchService } from '../src/search';
import { JournalManager } from '../src/journal';

describe('Embedding and Search functionality', () => {
  let projectTempDir: string;
  let userTempDir: string;
  let journalManager: JournalManager;
  let searchService: SearchService;
  let originalHome: string | undefined;

  beforeEach(async () => {
    projectTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-project-test-'));
    userTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-user-test-'));

    originalHome = process.env.HOME;
    process.env.HOME = userTempDir;

    journalManager = new JournalManager(projectTempDir);
    searchService = new SearchService(projectTempDir, path.join(userTempDir, '.private-journal'));
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

  test('embedding service initializes and generates embeddings', async () => {
    const embeddingService = EmbeddingService.getInstance();
    const embedding = await embeddingService.generateEmbedding('This is a test journal entry about TypeScript programming.');

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
    expect(typeof embedding[0]).toBe('number');
  }, 30000);

  test('embedding service extracts searchable text from markdown', async () => {
    const embeddingService = EmbeddingService.getInstance();

    const markdown = `---
title: "Test Entry"
date: 2025-05-31T12:00:00.000Z
timestamp: 1717056000000
---

## Feelings

I feel great about this feature implementation.

## Technical Insights

TypeScript interfaces are really powerful for maintaining code quality.`;

    const { text, sections } = embeddingService.extractSearchableText(markdown);

    expect(text).toContain('I feel great about this feature implementation');
    expect(text).toContain('TypeScript interfaces are really powerful');
    expect(text).not.toContain('title: "Test Entry"');
    expect(sections).toEqual(['Feelings', 'Technical Insights']);
  });

  test('cosine similarity calculation works correctly', () => {
    const embeddingService = EmbeddingService.getInstance();
    const vector1 = [1, 0, 0];
    const vector2 = [1, 0, 0];
    const vector3 = [0, 1, 0];

    expect(embeddingService.cosineSimilarity(vector1, vector2)).toBeCloseTo(1.0, 5);
    expect(embeddingService.cosineSimilarity(vector1, vector3)).toBeCloseTo(0.0, 5);
  });

  test('journal manager generates embeddings when writing thoughts', async () => {
    await journalManager.writeThoughts({
      feelings: 'I feel excited about implementing this search feature',
      technical_insights: 'Vector embeddings provide semantic understanding of text',
    });

    const dateString = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const userDayDir = path.join(userTempDir, '.private-journal', dateString);
    const userFiles = await fs.readdir(userDayDir);

    const userMdFile = userFiles.find((file) => file.endsWith('.md'));
    const userEmbeddingFile = userFiles.find((file) => file.endsWith('.embedding'));

    expect(userMdFile).toBeDefined();
    expect(userEmbeddingFile).toBeDefined();

    if (userEmbeddingFile) {
      const embeddingContent = await fs.readFile(path.join(userDayDir, userEmbeddingFile), 'utf8');
      const embeddingData = JSON.parse(embeddingContent);

      expect(embeddingData.embedding).toBeDefined();
      expect(Array.isArray(embeddingData.embedding)).toBe(true);
      expect(embeddingData.text).toContain('excited about implementing');
      expect(embeddingData.sections).toContain('Feelings');
      expect(embeddingData.sections).toContain('Technical Insights');
    }
  }, 60000);

  test('search service returns the written TypeScript frustration entry', async () => {
    await journalManager.writeThoughts({ feelings: 'I feel frustrated with debugging TypeScript errors' });
    await journalManager.writeThoughts({ technical_insights: 'JavaScript async patterns can be tricky to understand' });
    await journalManager.writeThoughts({ project_notes: 'The React component architecture is working well' });

    const results = await searchService.search('feeling upset about TypeScript problems');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.text.includes('frustrated') && result.text.includes('TypeScript'))).toBe(true);
    expect(results.every((result) => result.score >= 0.1)).toBe(true);
  }, 90000);

  test('search service can filter by entry type', async () => {
    await journalManager.writeThoughts({ project_notes: 'This project uses React and TypeScript' });
    await journalManager.writeThoughts({ feelings: 'I enjoy working with modern JavaScript frameworks' });

    const projectResults = await searchService.search('React TypeScript', { type: 'project' });
    const userResults = await searchService.search('React TypeScript', { type: 'user' });

    expect(projectResults.length).toBeGreaterThan(0);
    expect(projectResults[0].type).toBe('project');

    if (userResults.length > 0) {
      expect(userResults[0].type).toBe('user');
    }
  }, 90000);
});
