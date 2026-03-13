// ABOUTME: Local embedding service using transformers for semantic journal search
// ABOUTME: Provides text embedding generation and similarity computation utilities

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EmbeddingData {
  embedding: number[];
  text: string;
  sections: string[];
  timestamp: number;
  path: string;
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private extractor: FeatureExtractionPipeline | null = null;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private readonly fallbackDimensions = 384;
  private initPromise: Promise<void> | null = null;
  private useFallback = false;

  private constructor() {}

  private logDebug(message: string, error?: unknown): void {
    if (process.env.PRIVATE_JOURNAL_DEBUG === '1') {
      if (error !== undefined) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
  }

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      this.logDebug('Loading embedding model...');
      this.extractor = await pipeline('feature-extraction', this.modelName);
      this.logDebug('Embedding model loaded successfully');
    } catch (error) {
      this.logDebug('Failed to load embedding model:', error);
      this.useFallback = true;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor && !this.useFallback) {
      await this.initialize();
    }

    if (this.extractor) {
      try {
        const result = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
      } catch (error) {
        this.logDebug('Failed to generate transformer embedding, using fallback:', error);
        this.useFallback = true;
      }
    }

    if (this.useFallback) {
      return this.generateFallbackEmbedding(text);
    }

    throw new Error('Embedding model not initialized');
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async saveEmbedding(filePath: string, embeddingData: EmbeddingData): Promise<void> {
    const embeddingPath = filePath.replace(/\.md$/, '.embedding');
    await fs.writeFile(embeddingPath, JSON.stringify(embeddingData, null, 2), 'utf8');
  }

  async loadEmbedding(filePath: string): Promise<EmbeddingData | null> {
    const embeddingPath = filePath.replace(/\.md$/, '.embedding');
    
    try {
      const content = await fs.readFile(embeddingPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  extractSearchableText(markdownContent: string): { text: string; sections: string[] } {
    // Remove YAML frontmatter
    const withoutFrontmatter = markdownContent.replace(/^---\n.*?\n---\n/s, '');
    
    // Extract sections
    const sections: string[] = [];
    const sectionMatches = withoutFrontmatter.match(/^## (.+)$/gm);
    if (sectionMatches) {
      sections.push(...sectionMatches.map(match => match.replace('## ', '')));
    }

    // Clean up markdown for embedding
    const cleanText = withoutFrontmatter
      .replace(/^## .+$/gm, '') // Remove section headers
      .replace(/\n{3,}/g, '\n\n') // Normalize whitespace
      .trim();

    return {
      text: cleanText,
      sections
    };
  }

  private generateFallbackEmbedding(text: string): number[] {
    const vector = new Array<number>(this.fallbackDimensions).fill(0);
    const tokens = this.tokenize(text);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      this.accumulateFeature(vector, token, 1);

      if (token.length >= 3) {
        for (let index = 0; index <= token.length - 3; index += 1) {
          this.accumulateFeature(vector, token.slice(index, index + 3), 0.35);
        }
      }
    }

    let magnitude = 0;
    for (const value of vector) {
      magnitude += value * value;
    }

    if (magnitude === 0) {
      return vector;
    }

    const scale = Math.sqrt(magnitude);
    return vector.map((value) => value / scale);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((token) => this.normalizeToken(token))
      .filter((token) => token.length > 0);
  }

  private normalizeToken(token: string): string {
    if (token.endsWith('ies') && token.length > 4) {
      return `${token.slice(0, -3)}y`;
    }

    if (token.endsWith('es') && token.length > 4) {
      return token.slice(0, -2);
    }

    if (token.endsWith('s') && token.length > 3) {
      return token.slice(0, -1);
    }

    return token;
  }

  private accumulateFeature(vector: number[], feature: string, weight: number): void {
    const hash = this.hashFeature(feature);
    const index = hash % this.fallbackDimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += weight * sign;
  }

  private hashFeature(feature: string): number {
    let hash = 2166136261;

    for (let index = 0; index < feature.length; index += 1) {
      hash ^= feature.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }
}
