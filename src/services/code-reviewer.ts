import { GitHubService } from './github';
import { AIClient } from './ai-client';
import { AIChatMessage, DeepSeekChatCompletionResponse } from '../types/ai';
import { GeminiClient } from './gemini-client';
import { DeepSeekClient } from './deepseek-client';
import { systemPrompt } from '../utils/ai-prompts';
import { Logger } from '../utils/logger';
import { PullRequestData, ReviewStatus } from '../types';
import config from '../utils/config';
import { AIResponseParser } from '../utils/ai-response-parser';
import { DiffProcessor } from '../utils/diff-processor';
import { ReviewComment } from '../types';
import { DIFF_PROCESSING } from '../utils/constants';

export class CodeReviewService {
  private githubService: GitHubService;
  private aiClient: AIClient;
  private responseParser: AIResponseParser;
  private diffProcessor: DiffProcessor;
  private logger: Logger;

  /**
   * Creates a new CodeReviewService instance.
   *
   * @param {GitHubService} [githubService] - Optional GitHubService instance for dependency injection.
   * @param {AIClient} [aiClient] - Optional AIClient instance for dependency injection.
   * @param {AIResponseParser} [responseParser] - Optional AIResponseParser instance for dependency injection.
   * @param {Logger} [logger] - Optional Logger instance for dependency injection.
   * @param {DiffProcessor} [diffProcessor] - Optional DiffProcessor instance for dependency injection.
   */
  constructor(
    githubService?: GitHubService,
    aiClient?: AIClient,
    responseParser?: AIResponseParser,
    logger?: Logger,
    diffProcessor?: DiffProcessor
  ) {
    this.githubService = githubService || new GitHubService();
    this.responseParser = responseParser || new AIResponseParser();
    this.logger = logger || new Logger();
    this.diffProcessor = diffProcessor || new DiffProcessor();
    this.aiClient = aiClient || this._initializeAiClient();
  }

  private _initializeAiClient(): AIClient {
    const aiProvider = process.env.AI_PROVIDER || 'gemini';
    const geminiKey = process.env.GEMINI_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    this.logger.info('Initializing AI client', { provider: aiProvider });

    try {
      if (aiProvider === 'gemini') {
        if (!geminiKey) throw new Error('GEMINI_API_KEY is not set but AI_PROVIDER is gemini');
        this.logger.info('Using Gemini as primary AI provider');
        return new GeminiClient(geminiKey);
      } else if (aiProvider === 'deepseek') {
        if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY is not set but AI_PROVIDER is deepseek');
        this.logger.info('Using DeepSeek as primary AI provider');
        return new DeepSeekClient(deepseekKey);
      } else {
        throw new Error(`Unknown AI provider: ${aiProvider}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize ${aiProvider} client, attempting fallback`, error as Error);

      try {
        if (aiProvider === 'gemini' && deepseekKey) {
          this.logger.info('Fallback to DeepSeek AI provider');
          return new DeepSeekClient(deepseekKey);
        } else if (aiProvider === 'deepseek' && geminiKey) {
          this.logger.info('Fallback to Gemini AI provider');
          return new GeminiClient(geminiKey);
        } else {
          throw new Error('No fallback AI provider available - ensure at least one valid API key is configured');
        }
      } catch (fallbackError) {
        this.logger.error('Failed to initialize both primary and fallback AI providers', fallbackError as Error);
        throw new Error('Failed to initialize any AI provider. Check API keys and provider configuration.');
      }
    }
  }

  private async _handleLargeDiff(
    owner: string,
    repo: string,
    pullNumber: number,
    prData: PullRequestData,
    combinedDiff: string
  ): Promise<boolean> {
    let finalDiff = combinedDiff;

    if (finalDiff.length > config.MAX_DIFF_SIZE) {
      this.logger.warn('Diff is very large, applying file type filtering', {
        diffSize: finalDiff.length,
        pullNumber,
      });

      finalDiff = this.diffProcessor.filterDiffByExtensions(
        finalDiff,
        config.ALLOWED_FILE_EXTENSIONS
      );

      this.logger.info('Filtered diff by file extensions', {
        originalSize: prData.diff.length,
        filteredSize: finalDiff.length,
      });

      if (finalDiff.length === 0) {
        await this.githubService.postPRComment(
          owner,
          repo,
          pullNumber,
          `## 🤖 Code Critics AI Review\n\n⚠️ **Review skipped: Diff too large**\n\nThis pull request is too large to review automatically. The diff exceeds our processing limit, and no supported code files were found after filtering.\n\nConsider breaking this PR into smaller, more focused changes.\n\n---\n*Powered by Code Critics AI*\n<!-- code-critics-review -->\n<!-- timestamp: ${Date.now()} -->`
        );

        await this.githubService.setCommitStatus(
          owner,
          repo,
          pullNumber,
          'success',
          'Review skipped: Diff too large and no supported files found.'
        );
        return true; // Indicate that review was skipped
      }

      if (finalDiff.length > config.MAX_DIFF_SIZE * DIFF_PROCESSING.LARGE_DIFF_MULTIPLIER) {
        await this.githubService.postPRComment(
          owner,
          repo,
          pullNumber,
          `## 🤖 Code Critics AI Review\n\n⚠️ **Review skipped: Diff too large**\n\nEven after filtering to only include supported file types, this pull request is too large to review automatically.\n\nConsider breaking this PR into smaller, more focused changes.\n\n---\n*Powered by Code Critics AI*\n<!-- code-critics-review -->\n<!-- timestamp: ${Date.now()} -->`
        );

        await this.githubService.setCommitStatus(
          owner,
          repo,
          pullNumber,
          'success',
          'Review skipped: Filtered diff still too large.'
        );
        return true; // Indicate that review was skipped
      }
    }
    return false; // Indicate that review was not skipped
  }

  /**
   * Sanitize error messages for public display to prevent sensitive information leakage
   * 
   * @param errorMessage - Raw error message
   * @returns Sanitized error message safe for public display
   */
  private sanitizeErrorForPublic(errorMessage: string): string {
    // Remove API keys, tokens, and sensitive patterns
    let sanitized = errorMessage
      .replace(/[a-zA-Z0-9_-]{32,}/g, '[REDACTED]')
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(/token['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'token: [REDACTED]')
      .replace(/key['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'key: [REDACTED]')
      .replace(/secret['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'secret: [REDACTED]');

    // Generic error messages for common issues
    if (sanitized.toLowerCase().includes('api key') || sanitized.toLowerCase().includes('auth')) {
      return 'Authentication configuration issue detected.';
    }
    
    if (sanitized.toLowerCase().includes('network') || sanitized.toLowerCase().includes('fetch')) {
      return 'Network connectivity issue encountered.';
    }
    
    if (sanitized.toLowerCase().includes('timeout')) {
      return 'Request timeout - the review took too long to complete.';
    }
    
    if (sanitized.toLowerCase().includes('rate limit')) {
      return 'Rate limit exceeded - please try again later.';
    }
    
    // For other errors, provide a generic message
    return 'An unexpected error occurred during the review process.';
  }

  /**
   * Conduct a code review on a pull request
   * 
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - Pull request number
   * @returns Promise that resolves when review is complete
   */
  async conductReview(owner: string, repo: string, pullNumber: number): Promise<void> {
    this.logger.info(`Starting code review for ${owner}/${repo} PR #${pullNumber}`);

    try {
      // Set status to pending
      await this.githubService.setCommitStatus(owner, repo, pullNumber, 'pending', 'Code review in progress...');

      const prData = await this.githubService.getPullRequestData(owner, repo, pullNumber);
      let combinedDiff = prData.diff;

      // Handle large diffs and check if review should be skipped
      if (await this._handleLargeDiff(owner, repo, pullNumber, prData, combinedDiff)) {
        return; // Review was skipped, exit early
      }

      const messages: AIChatMessage[] = [
        { role: 'user', content: systemPrompt },
        {
          role: 'user', content: `Please review the following pull request diff:\n\`\`\`diff\n${combinedDiff}\n\`\`\`\n\nProvide your feedback in the specified format.`
        },
      ];

      this.logger.info('Sending diff to AI for review...', { pr: pullNumber, diffSize: combinedDiff.length });
      const aiResponse = await this.aiClient.generateCompletion(messages);
      this.logger.info('AI review completed.', { pr: pullNumber });

      const comments = this.responseParser.parseAIResponse(aiResponse);

      if (comments.length > 0) {
        await this.githubService.createReview(
          owner,
          repo,
          pullNumber,
          {
            body: 'Code Critic AI Review Summary:', // A summary will be generated later based on comments
            event: 'COMMENT', // Or 'REQUEST_CHANGES' if severity is high
            comments: comments.map(c => ({
              path: c.path,
              line: c.line,
              body: c.body,
            })),
          }
        );
        this.logger.info(`Posted ${comments.length} review comments for PR #${pullNumber}`);
        await this.githubService.setCommitStatus(owner, repo, pullNumber, 'failure', 'Code review completed with suggestions.');
      } else {
        await this.githubService.postPRComment(
          owner,
          repo,
          pullNumber,
          'No significant issues found. Good job!'
        );
        this.logger.info(`No significant issues found for PR #${pullNumber}`);
        await this.githubService.setCommitStatus(owner, repo, pullNumber, 'success', 'Code review completed: No significant issues found.');
      }

    } catch (error) {
      this.logger.error('Error during code review', error as Error, { owner, repo, pullNumber });
      
      // Sanitize error message for public display
      const publicErrorMessage = this.sanitizeErrorForPublic((error as Error).message);
      
      await this.githubService.postPRComment(
        owner,
        repo,
        pullNumber,
        `## 🤖 Code Critics AI Review\n\n❌ **Review failed**\n\n${publicErrorMessage}\n\nPlease try again later or contact support if the issue persists.\n\n---\n*Powered by Code Critics AI*\n<!-- code-critics-error -->`
      );
      await this.githubService.setCommitStatus(owner, repo, pullNumber, 'error', 'Code review failed - please check logs');
      throw error; // Re-throw to indicate failure
    }
  }
}
