// ABOUTME: Shared domain types for the private journal CLI
// ABOUTME: Describes structured thoughts and metadata returned by write commands

export interface ThoughtSections {
  feelings?: string;
  project_notes?: string;
  user_context?: string;
  technical_insights?: string;
  world_knowledge?: string;
}

export interface WrittenEntry {
  path: string;
  timestamp: number;
  title: string;
  sections: string[];
  scope: 'project' | 'user';
}

export interface WrittenThoughtsResult {
  project?: WrittenEntry;
  user?: WrittenEntry;
}
