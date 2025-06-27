import { Octokit } from '@octokit/rest';
import { PullRequestData, ReviewComment } from '../types';
import { Logger } from '../utils/logger';
import config from '../utils/config';

export class GitHubService {
  private octokit: Octokit;
  private logger = new Logger();

  constructor() {
    this.octokit = new Octokit({
      auth: config.GITHUB_TOKEN,
      userAgent: 'code-critics/1.0.0',
      log: {
        debug: this.logger.debug.bind(this.logger),
        info: this.logger.info.bind(this.logger),
        warn: this.logger.warn.bind(this.logger),
        error: this.logger.error.bind(this.logger)
      }
    });
  }

  /**
   * Validate GitHub token and get authenticated user info
   */
  async validateToken(): Promise<{ login: string; id: number }> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.logger.info('GitHub token validated', { user: data.login });
      return { login: data.login, id: data.id };
    } catch (error) {
      this.logger.error('GitHub token validation failed', error);
      throw new Error('Invalid GitHub token');
    }
  }

  /**
   * Check if repository is in allowlist (if configured)
   */
  isRepositoryAllowed(fullName: string): boolean {
    if (!config.ALLOWED_REPOSITORIES) {
      return true; // No allowlist configured, allow all
    }

    const allowedRepos = config.ALLOWED_REPOSITORIES.split(',').map(repo => repo.trim());
    return allowedRepos.includes(fullName);
  }

  /**
   * Get pull request data including diff and file changes
   */
  async getPullRequestData(
    owner: string,
    repo: string,
    pullNumber: number,
    diffUrl?: string
  ): Promise<PullRequestData> {
    this.logger.info('Fetching pull request data', { owner, repo, pullNumber });

    try {
      // Get PR details
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });

      // Get changed files
      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber
      });

      // Get diff - prefer provided diffUrl for webhook payloads
      let diff: string;
      if (diffUrl) {
        const response = await fetch(diffUrl, {
          headers: {
            'Authorization': `token ${config.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3.diff'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch diff: ${response.statusText}`);
        }
        
        diff = await response.text();
      } else {
        // Fallback to compare API
        const { data: diffData } = await this.octokit.rest.repos.compareCommits({
          owner,
          repo,
          base: pr.base.sha,
          head: pr.head.sha,
          mediaType: { format: 'diff' }
        });
        diff = diffData as unknown as string;
      }

      // Filter files by type if diff is too large
      let filteredFiles = files;
      if (diff.length > config.MAX_DIFF_SIZE) {
        const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.php'];
        filteredFiles = files.filter(file => 
          allowedExtensions.some(ext => file.filename.endsWith(ext))
        );
        
        this.logger.info('Large PR detected, filtering to code files only', {
          originalFiles: files.length,
          filteredFiles: filteredFiles.length,
          diffSize: diff.length
        });
      }

      return {
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        diff,
        files: filteredFiles.map(file => ({
          filename: file.filename,
          status: file.status,
          patch: file.patch,
          additions: file.additions,
          deletions: file.deletions
        }))
      };
    } catch (error) {
      this.logger.error('Failed to fetch pull request data', error);
      throw error;
    }
  }

  /**
   * Post an inline review comment on a specific line
   */
  async postInlineComment(
    owner: string,
    repo: string,
    pullNumber: number,
    comment: ReviewComment
  ): Promise<void> {
    try {
      await this.octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pullNumber,
        body: comment.body,
        path: comment.path,
        line: comment.line,
        side: comment.side || 'RIGHT'
      });
      
      this.logger.debug('Posted inline comment', {
        path: comment.path,
        line: comment.line
      });
    } catch (error) {
      this.logger.error('Failed to post inline comment', error, {
        path: comment.path,
        line: comment.line
      });
      throw error;
    }
  }

  /**
   * Post a general comment on the PR
   */
  async postPRComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
  ): Promise<void> {
    try {
      await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body
      });
      
      this.logger.debug('Posted PR comment');
    } catch (error) {
      this.logger.error('Failed to post PR comment', error);
      throw error;
    }
  }

  /**
   * Create a review with multiple inline comments and a summary
   */
  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    review: {
      body: string;
      event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
      comments: ReviewComment[];
    }
  ): Promise<void> {
    try {
      await this.octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        body: review.body,
        event: review.event,
        comments: review.comments.map(comment => ({
          path: comment.path,
          line: comment.line,
          body: comment.body
        }))
      });
      
      this.logger.info('Created review', {
        event: review.event,
        commentsCount: review.comments.length
      });
    } catch (error) {
      this.logger.error('Failed to create review', error);
      throw error;
    }
  }

  /**
   * Find existing bot comments to avoid duplication
   */
  async findExistingBotComments(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{ id: number; body: string; created_at: string }>> {
    try {
      const { data: comments } = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber
      });

      return comments
        .filter(comment => 
          comment.user?.login === 'code-critics[bot]' ||
          comment.body.includes('<!-- code-critics-comment -->') ||
          comment.body.includes('<!-- code-critics-review -->')
        )
        .map(comment => ({
          id: comment.id,
          body: comment.body,
          created_at: comment.created_at
        }));
    } catch (error) {
      this.logger.error('Failed to fetch existing comments', error);
      return [];
    }
  }

  /**
   * Check rate limit status
   */
  async checkRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  }> {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
        used: data.rate.used
      };
    } catch (error) {
      this.logger.error('Failed to check rate limit', error);
      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff for rate limiting
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries) throw error;
        
        // Check if it's a rate limit error
        if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
          const waitTime = resetTime - Date.now() + 1000; // Add 1 second buffer
          
          this.logger.warn(`Rate limited. Waiting ${waitTime}ms until reset.`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Exponential backoff for other errors
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, { error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}