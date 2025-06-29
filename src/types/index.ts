// Core type definitions for Code Critics

export interface WebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
    private: boolean;
  };
  pull_request?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    diff_url: string;
    patch_url: string;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      sha: string;
      ref: string;
    };
  };
  issue?: {
    number: number;
    pull_request?: {
      url: string;
    };
  };
  comment?: {
    id: number;
    body: string;
    user: {
      login: string;
    };
  };
}

export interface PullRequestData {
  number: number;
  title: string;
  body: string;
  diff: string;
  files: Array<{
    filename: string;
    status: string;
    patch?: string;
    additions: number;
    deletions: number;
  }>;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side?: 'LEFT' | 'RIGHT';
}

export interface ReviewRequest {
  owner: string;
  repo: string;
  pullNumber: number;
  diffUrl?: string;
  isManualTrigger?: boolean;
}

export interface CodeReviewResult {
  type: 'bug' | 'security';
  severity: 'critical' | 'high';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface LogContext {
  requestId?: string;
  repository?: string;
  pullNumber?: number;
  provider?: string;
  duration?: number;
  [key: string]: any;
}

export interface GitHubCheckRun {
  owner: string;
  repo: string;
  head_sha: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
  output?: {
    title: string;
    summary: string;
    text?: string;
  };
}

export type ReviewStatus = 'pending' | 'success' | 'failure' | 'error';