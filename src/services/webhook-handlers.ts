import { EmitterWebhookEvent } from '@octokit/webhooks';
import { GitHubService } from './github';
import { Logger } from '../utils/logger';
import { 
  extractRepositoryInfo, 
  shouldProcessEvent, 
  repositoryRateLimit 
} from '../utils/webhook-security';
import { WebhookPayload } from '../types';

const githubService = new GitHubService();
const logger = new Logger();

/**
 * Handle pull request events (opened, synchronize, reopened)
 */
export async function handlePullRequestEvent(
  event: EmitterWebhookEvent<'pull_request.opened' | 'pull_request.synchronize' | 'pull_request.reopened'>
): Promise<void> {
  const { payload } = event;
  const { repository, pull_request } = payload;
  
  logger.setContext({
    repository: repository.full_name,
    pullNumber: pull_request.number,
    requestId: `pr-${pull_request.id}-${Date.now()}`
  });

  logger.info('Processing pull request event', {
    action: payload.action,
    title: pull_request.title,
    author: pull_request.user.login
  });

  try {
    // Check if we should process this event
    const { shouldProcess, reason } = shouldProcessEvent(payload);
    if (!shouldProcess) {
      logger.info('Skipping event processing', { reason });
      return;
    }

    // Extract repository info
    const { owner, repo, fullName } = extractRepositoryInfo(payload);

    // Check repository allowlist
    if (!githubService.isRepositoryAllowed(fullName)) {
      logger.warn('Repository not in allowlist', { repository: fullName });
      return;
    }

    // Check rate limiting
    if (!repositoryRateLimit.isAllowed(fullName)) {
      logger.warn('Rate limit exceeded for repository', { 
        repository: fullName,
        remaining: repositoryRateLimit.getRemainingRequests(fullName)
      });
      
      // Post rate limit warning comment
      await postRateLimitWarning(owner, repo, pull_request.number);
      return;
    }

    // Check if we should skip this review (avoid duplicates)
    if (await shouldSkipReview(owner, repo, pull_request.number, false)) {
      logger.info('Skipping review - recent review already exists');
      return;
    }

    // Process the review (placeholder for now - will be implemented in Phase 3)
    await processReview({
      owner,
      repo,
      pullNumber: pull_request.number,
      diffUrl: pull_request.diff_url,
      isManualTrigger: false
    });

    logger.info('Pull request event processed successfully');

  } catch (error) {
    logger.error('Failed to process pull request event', error);
    
    // Post error comment to PR
    await postErrorComment(
      repository.owner.login,
      repository.name,
      pull_request.number,
      error as Error
    );
    
    throw error;
  }
}

/**
 * Handle issue comment events (manual trigger via @codecritics)
 */
export async function handleIssueCommentEvent(
  event: EmitterWebhookEvent<'issue_comment.created'>
): Promise<void> {
  const { payload } = event;
  const { repository, issue, comment } = payload;

  // Only process comments on PRs
  if (!issue.pull_request) {
    return;
  }

  logger.setContext({
    repository: repository.full_name,
    pullNumber: issue.number,
    requestId: `comment-${comment.id}-${Date.now()}`
  });

  logger.info('Processing manual review request', {
    commenter: comment.user.login,
    commentPreview: comment.body.substring(0, 100)
  });

  try {
    // Check if we should process this event
    const { shouldProcess, reason } = shouldProcessEvent(payload);
    if (!shouldProcess) {
      logger.info('Skipping comment processing', { reason });
      return;
    }

    // Extract repository info
    const { owner, repo, fullName } = extractRepositoryInfo(payload);

    // Check repository allowlist
    if (!githubService.isRepositoryAllowed(fullName)) {
      logger.warn('Repository not in allowlist', { repository: fullName });
      return;
    }

    // Check rate limiting (more lenient for manual triggers)
    if (!repositoryRateLimit.isAllowed(`${fullName}-manual`)) {
      logger.warn('Rate limit exceeded for manual reviews', { 
        repository: fullName,
        remaining: repositoryRateLimit.getRemainingRequests(`${fullName}-manual`)
      });
      
      await postRateLimitWarning(owner, repo, issue.number);
      return;
    }

    // Manual triggers can override recent review checks
    const shouldSkip = await shouldSkipReview(owner, repo, issue.number, true);
    if (shouldSkip) {
      logger.info('Recent review exists, but processing manual trigger anyway');
    }

    // Process the review
    await processReview({
      owner,
      repo,
      pullNumber: issue.number,
      isManualTrigger: true
    });

    logger.info('Manual review request processed successfully');

  } catch (error) {
    logger.error('Failed to process manual review request', error);
    
    // Post error comment
    await postErrorComment(
      repository.owner.login,
      repository.name,
      issue.number,
      error as Error
    );
    
    throw error;
  }
}

/**
 * Check if we should skip this review to avoid duplicates
 */
async function shouldSkipReview(
  owner: string,
  repo: string,
  pullNumber: number,
  isManualTrigger: boolean
): Promise<boolean> {
  try {
    const existingComments = await githubService.findExistingBotComments(
      owner,
      repo,
      pullNumber
    );

    if (existingComments.length === 0) {
      return false; // No existing comments, proceed with review
    }

    // For manual triggers, we're more permissive
    if (isManualTrigger) {
      return false; // Always allow manual triggers
    }

    // Check if we have a recent review comment (within last hour)
    const recentReview = existingComments.find(comment => {
      if (!comment.body.includes('<!-- code-critics-review -->')) {
        return false;
      }

      const timestampMatch = comment.body.match(/<!-- timestamp: (\d+) -->/);
      if (!timestampMatch) {
        return false;
      }

      const timestamp = parseInt(timestampMatch[1]);
      const hoursSinceComment = (Date.now() - timestamp) / (1000 * 60 * 60);
      
      return hoursSinceComment < 1; // Consider recent if less than 1 hour old
    });

    return !!recentReview;
  } catch (error) {
    logger.error('Error checking for existing reviews', error);
    return false; // If we can't check, proceed with review
  }
}

/**
 * Process the actual review (placeholder for Phase 3 implementation)
 */
async function processReview(request: {
  owner: string;
  repo: string;
  pullNumber: number;
  diffUrl?: string;
  isManualTrigger: boolean;
}): Promise<void> {
  const { owner, repo, pullNumber, diffUrl, isManualTrigger } = request;
  
  logger.info('Starting review process', {
    isManualTrigger,
    hasDiffUrl: !!diffUrl
  });

  try {
    // For now, just post a placeholder comment indicating the system is working
    const comment = `## 🤖 Code Critics Review

${isManualTrigger ? '👋 Manual review requested!' : '🔄 Automatic review triggered'}

**Status**: System is operational and webhook processing is working correctly.

**Next Steps**: AI-powered code analysis will be implemented in Phase 3.

---
*Powered by Code Critics AI • Phase 2 Implementation*

<!-- code-critics-review -->
<!-- timestamp: ${Date.now()} -->`;

    await githubService.postPRComment(owner, repo, pullNumber, comment);
    
    logger.info('Placeholder review comment posted successfully');

  } catch (error) {
    logger.error('Failed to process review', error);
    throw error;
  }
}

/**
 * Post rate limit warning comment
 */
async function postRateLimitWarning(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<void> {
  try {
    const resetTime = new Date(repositoryRateLimit.getResetTime(`${owner}/${repo}`));
    const comment = `## 🤖 Code Critics Review

⚠️ **Rate limit exceeded**

This repository has exceeded the review rate limit. Please try again after ${resetTime.toLocaleString()}.

**Rate Limit**: 10 reviews per hour per repository

---
*Powered by Code Critics AI*

<!-- code-critics-rate-limit -->
<!-- timestamp: ${Date.now()} -->`;

    await githubService.postPRComment(owner, repo, pullNumber, comment);
  } catch (error) {
    logger.error('Failed to post rate limit warning', error);
  }
}

/**
 * Post error comment when review processing fails
 */
async function postErrorComment(
  owner: string,
  repo: string,
  pullNumber: number,
  error: Error
): Promise<void> {
  try {
    // Determine error detail level based on error type
    let errorMessage = 'An unexpected error occurred while processing the review.';
    
    if (error.message.includes('rate limit')) {
      errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
    } else if (error.message.includes('token')) {
      errorMessage = 'Authentication error. Please check the GitHub token configuration.';
    } else if (error.message.includes('not found')) {
      errorMessage = 'Repository or pull request not found.';
    } else if (process.env.NODE_ENV === 'development') {
      // Show detailed errors in development
      errorMessage = `Error: ${error.message}`;
    }

    const comment = `## 🤖 Code Critics Review

❌ **Review failed**

${errorMessage}

Please try again later or trigger a manual review by commenting \`@codecritics\`.

---
*Powered by Code Critics AI • [Report Issues](https://github.com/your-username/code-critics/issues)*

<!-- code-critics-error -->
<!-- timestamp: ${Date.now()} -->`;

    await githubService.postPRComment(owner, repo, pullNumber, comment);
  } catch (commentError) {
    logger.error('Failed to post error comment', commentError);
  }
}