import { Octokit } from '@octokit/rest';
import { PullRequestData, ReviewComment, ReviewStatus } from '../types';
import { Logger } from '../utils/logger';
import config from '../utils/config';

/**
 * Service for interacting with GitHub API
 * Uses dependency injection for better testability
 */
export class GitHubService {
  private octokit: Octokit;
  private logger: Logger;

  /**
   * Creates a new GitHub service instance
   * 
   * @param octokit - Optional Octokit instance for dependency injection
   * @param logger - Optional logger instance for dependency injection
   */
  constructor(octokit?: Octokit, logger?: Logger) {
    this.logger = logger || new Logger();
    
    this.octokit = octokit || new Octokit({
      auth: config.GITHUB_TOKEN,
      userAgent: 'code-critics/1.0.0',
      log: {
        debug: (msg: string, ...args: any[]) => this.logger.debug(this.sanitizeLogMessage(msg), ...args),
        info: (msg: string, ...args: any[]) => this.logger.info(this.sanitizeLogMessage(msg), ...args),
        warn: (msg: string, ...args: any[]) => this.logger.warn(this.sanitizeLogMessage(msg), ...args),
        error: (msg: string, ...args: any[]) => this.logger.error(this.sanitizeLogMessage(msg), ...args)
      }
    });
  }

  /**
   * Sanitize log messages to prevent token exposure
   * 
   * @param message - Log message to sanitize
   * @returns Sanitized message with sensitive data redacted
   */
  private sanitizeLogMessage(message: string): string {
    return message
      .replace(/Authorization:\s*token\s+[^\s]+/gi, 'Authorization: token [REDACTED]')
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(/token\s+[a-zA-Z0-9_-]{20,}/gi, 'token [REDACTED]');
  }

  /**
   * Validate GitHub token and get authenticated user info
   * 
   * @returns Promise resolving to user login and ID
   * @throws Error if token is invalid
   */
  async validateToken(): Promise<{ login: string; id: number; }> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.logger.info('GitHub token validated', { user: data.login });
      return { login: data.login, id: data.id };
    } catch (error) {
      this.logger.error('GitHub token validation failed', error as Error);
      throw new Error('Invalid GitHub token');
    }
  }

  /**
   * Check if repository is in allowlist (if configured)
   * 
   * @param fullName - Full repository name (owner/repo)
   * @returns Boolean indicating if repository is allowed
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
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @param diffUrl - Optional URL to fetch diff from
   * @returns Promise resolving to pull request data
   * @throws Error if data cannot be fetched
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
        // Security fix: Validate diffUrl to prevent SSRF
        const validatedUrl = this.validateAndSanitizeDiffUrl(diffUrl, owner, repo, pullNumber);
        if (!validatedUrl) {
          throw new Error('Invalid diff URL provided');
        }
        
        const response = await fetch(validatedUrl, {
          headers: {
            'Authorization': `token ${config.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3.diff'
          }
        });

        if (!response.ok) {
          this.logger.error('Failed to fetch diff from GitHub', undefined, { 
            status: response.status, 
            statusText: response.statusText,
            url: '[REDACTED]' 
          });
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
      this.logger.error('Failed to fetch pull request data', error as Error);
      throw error;
    }
  }
  
  /**
   * Validate and sanitize diff URL to prevent SSRF attacks
   * Only accept GitHub API URLs for the specific repository and PR
   * 
   * @param url - URL to validate
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @returns Validated URL or null if invalid
   */
  private validateAndSanitizeDiffUrl(url: string, owner: string, repo: string, pullNumber: number): string | null {
    try {
      const parsedUrl = new URL(url);
      
      // Ensure URL is from GitHub API
      if (!parsedUrl.hostname.endsWith('github.com') && !parsedUrl.hostname.endsWith('githubusercontent.com')) {
        this.logger.warn('Invalid diff URL hostname', { url });
        return null;
      }
      
      // Ensure URL path contains repository and PR information
      const expectedPathSegments = [owner, repo, 'pull', pullNumber.toString()];
      const pathContainsAllSegments = expectedPathSegments.every(segment => 
        parsedUrl.pathname.includes(segment)
      );
      
      if (!pathContainsAllSegments) {
        this.logger.warn('Diff URL does not match expected repository and PR', { 
          url,
          owner,
          repo,
          pullNumber
        });
        return null;
      }
      
      // Only allow http/https protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        this.logger.warn('Invalid diff URL protocol', { url });
        return null;
      }
      
      return url;
    } catch (error) {
      this.logger.warn('Failed to parse diff URL', { url, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Post an inline review comment on a specific line
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @param comment - Comment data
   * @throws Error if comment cannot be posted
   */
  async postInlineComment(
    owner: string,
    repo: string,
    pullNumber: number,
    comment: ReviewComment
  ): Promise<void> {
    try {
      // First get the latest commit SHA for the PR
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });

      await this.octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pullNumber,
        body: comment.body,
        path: comment.path,
        line: comment.line,
        side: comment.side || 'RIGHT',
        commit_id: pr.head.sha
      });

      this.logger.debug('Posted inline comment', {
        path: comment.path,
        line: comment.line
      });
    } catch (error) {
      this.logger.error('Failed to post inline comment', error as Error, {
        path: comment.path,
        line: comment.line
      });
      throw error;
    }
  }

  /**
   * Post a general comment on the PR
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @param body - Comment body
   * @throws Error if comment cannot be posted
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
      this.logger.error('Failed to post PR comment', error as Error);
      throw error;
    }
  }

  /**
   * Create a review with multiple inline comments and a summary
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @param review - Review data
   * @throws Error if review cannot be created
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
      this.logger.error('Failed to create review', error as Error);
      throw error;
    }
  }

  /**
   * Find existing bot comments to avoid duplication
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @returns Array of existing bot comments
   */
  async findExistingBotComments(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{ id: number; body: string; created_at: string; }>> {
    try {
      const { data: comments } = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber
      });

      return comments
        .filter(comment =>
          comment.user?.login === 'code-critics[bot]' ||
          (comment.body?.includes('<!-- code-critics-comment -->') || false) ||
          (comment.body?.includes('<!-- code-critics-review -->') || false)
        )
        .map(comment => ({
          id: comment.id,
          body: comment.body || '',
          created_at: comment.created_at
        }));
    } catch (error) {
      this.logger.error('Failed to fetch existing comments', error as Error);
      return [];
    }
  }

  /**
   * Check rate limit status
   * 
   * @returns Promise resolving to rate limit information
   * @throws Error if rate limit cannot be checked
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
      this.logger.error('Failed to check rate limit', error as Error);
      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff for rate limiting
   * 
   * @param operation - Function to retry
   * @param maxRetries - Maximum number of retries
   * @param baseDelay - Base delay in milliseconds
   * @returns Promise resolving to operation result
   * @throws Error if operation fails after max retries
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

  /**
   * Set commit status for a given pull request
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @param status - Status to set
   * @param description - Status description
   * @param context - Status context
   * @throws Error if status cannot be set
   */
  async setCommitStatus(
    owner: string,
    repo: string,
    pullNumber: number,
    status: ReviewStatus,
    description: string,
    context: string = 'CodeCritic AI Review'
  ): Promise<void> {
    try {
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      await this.octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: pr.head.sha,
        state: status === 'pending' ? 'pending' : status === 'success' ? 'success' : 'failure',
        description,
        context,
      });
      this.logger.info(`Set commit status to '${status}' for PR #${pullNumber}`, { owner, repo, pullNumber, status, description });
    } catch (error) {
      this.logger.error('Failed to set commit status', error as Error, { owner, repo, pullNumber, status });
      throw error;
    }
  }
}
