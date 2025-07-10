/**
 * GitHub Domain Module
 * 
 * This module encapsulates all GitHub-related functionality including
 * API interactions, webhook handling, and security utilities.
 */

// GitHub services
export { GitHubService } from '../../services/github';

// Webhook handling
export {
  handlePullRequestEvent,
  handleIssueCommentEvent
} from '../../services/webhook-handlers';

// Security utilities
export {
  verifyWebhookSignature,
  validateWebhookPayload,
  extractRepositoryInfo,
  shouldProcessEvent,
  sanitizeWebhookPayload,
  sanitizeHeaders,
  repositoryRateLimit
} from '../../utils/webhook-security';

// GitHub-specific types
export type {
  PullRequestData,
  ReviewComment,
  ReviewStatus,
  WebhookPayload,
  ReviewRequest,
  GitHubCheckRun
} from '../../types'; 