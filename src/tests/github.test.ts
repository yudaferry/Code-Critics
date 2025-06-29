/**
 * Unit tests for GitHub service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubService } from '../services/github';
import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger';

// Mock dependencies
vi.mock('@octokit/rest');
vi.mock('../utils/logger');

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockOctokit: any;
  let mockLogger: any;
  
  beforeEach(() => {
    // Create mocks
    mockOctokit = {
      rest: {
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
    };
    
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };
    
    // Create service with mocked dependencies
    githubService = new GitHubService(mockOctokit as unknown as Octokit, mockLogger as unknown as Logger);
  });
  
  describe('validateToken', () => {
    it('should return user info when token is valid', async () => {
      const result = await githubService.validateToken();
      
      expect(result).toEqual({ login: 'test-user', id: 12345 });
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(1);
    });
    
    it('should throw error when token validation fails', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValueOnce(new Error('Invalid token'));
      
      await expect(githubService.validateToken()).rejects.toThrow('Invalid GitHub token');
    });
  });
  
  describe('getPullRequestData', () => {
    it('should fetch and return PR data', async () => {
      const result = await githubService.getPullRequestData('owner', 'repo', 1);
      
      expect(result).toHaveProperty('number', 1);
      expect(result).toHaveProperty('title', 'Test PR');
      expect(result).toHaveProperty('diff');
      expect(result).toHaveProperty('files');
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1
      });
    });
    
    it('should use diffUrl when provided', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('diff from url')
      });
      
      const result = await githubService.getPullRequestData('owner', 'repo', 1, 'https://github.com/owner/repo/pull/1.diff');
      
      expect(result.diff).toBe('diff from url');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('createReview', () => {
    it('should create a review with comments', async () => {
      await githubService.createReview('owner', 'repo', 1, {
        body: 'Review summary',
        event: 'COMMENT',
        comments: [
          { path: 'test.ts', line: 10, body: 'Test comment' }
        ]
      });
      
      expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        body: 'Review summary',
        event: 'COMMENT',
        comments: [
          { path: 'test.ts', line: 10, body: 'Test comment' }
        ]
      });
    });
  });
  
  describe('setCommitStatus', () => {
    it('should set commit status', async () => {
      await githubService.setCommitStatus('owner', 'repo', 1, 'success', 'All tests passed');
      
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalled();
      expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        sha: 'test-sha',
        state: 'success',
        description: 'All tests passed',
        context: 'CodeCritic AI Review'
      });
    });
  });
});
