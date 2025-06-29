/**
 * Test setup file for Code Critics
 * Configures the testing environment and mocks
 */

import { vi, beforeEach } from 'vitest';
import { config } from '../utils/config';

// Mock environment variables for testing
vi.mock('../utils/config', () => ({
  config: {
    GITHUB_TOKEN: 'test-token',
    WEBHOOK_SECRET: 'test-secret',
    GEMINI_API_KEY: 'test-gemini-key',
    DEEPSEEK_API_KEY: 'test-deepseek-key',
    AI_PROVIDER: 'gemini',
    MAX_DIFF_SIZE: 50000,
    LOG_LEVEL: 'error',
    NODE_ENV: 'test',
    ALLOWED_REPOSITORIES: undefined,
    ALLOWED_FILE_EXTENSIONS: ['.ts', '.js', '.jsx', '.tsx']
  }
}));

// Mock logger to prevent console output during tests
vi.mock('../utils/logger', () => ({
  Logger: class MockLogger {
    info() {}
    error() {}
    warn() {}
    debug() {}
    setContext() {}
  }
}));

// Mock Octokit for GitHub API tests
vi.mock('@octokit/rest', () => ({
  Octokit: class MockOctokit {
    rest = {
      users: {
        getAuthenticated: vi.fn().mockResolvedValue({
          data: { login: 'test-user', id: 12345 }
        })
      },
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: {
            number: 1,
            title: 'Test PR',
            body: 'Test body',
            head: { sha: 'test-sha' },
            base: { sha: 'base-sha' }
          }
        }),
        listFiles: vi.fn().mockResolvedValue({
          data: [
            {
              filename: 'test.ts',
              status: 'modified',
              patch: '@@ -1,5 +1,7 @@\n test',
              additions: 2,
              deletions: 0
            }
          ]
        }),
        createReviewComment: vi.fn().mockResolvedValue({}),
        createReview: vi.fn().mockResolvedValue({})
      },
      repos: {
        compareCommits: vi.fn().mockResolvedValue({
          data: 'diff --git a/test.ts b/test.ts\n@@ -1,5 +1,7 @@\n test'
        }),
        createCommitStatus: vi.fn().mockResolvedValue({})
      },
      issues: {
        createComment: vi.fn().mockResolvedValue({}),
        listComments: vi.fn().mockResolvedValue({ data: [] })
      },
      rateLimit: {
        get: vi.fn().mockResolvedValue({
          data: {
            rate: {
              limit: 5000,
              remaining: 4999,
              reset: Math.floor(Date.now() / 1000) + 3600,
              used: 1
            }
          }
        })
      }
    }
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.toString().includes('github.com')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve('diff --git a/test.ts b/test.ts\n@@ -1,5 +1,7 @@\n test')
    });
  }
  
  if (url.toString().includes('deepseek.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'No significant issues found. Good job!', role: 'assistant' } }]
      })
    });
  }
  
  return Promise.reject(new Error(`Unhandled fetch mock for URL: ${url}`));
}) as any;

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
