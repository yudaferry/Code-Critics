/**
 * Core application module exports
 * 
 * This module provides the main application components and services
 * organized by domain responsibility.
 */

// Core services
export { CodeReviewService } from '../services/code-reviewer';
export { GitHubService } from '../services/github';

// AI services
export { AIClient } from '../services/ai-client';
export { GeminiClient } from '../services/gemini-client';
export { DeepSeekClient } from '../services/deepseek-client';

// Webhook handling
export {
  handlePullRequestEvent,
  handleIssueCommentEvent
} from '../services/webhook-handlers';

// Utilities
export { Logger } from '../utils/logger';
export { AIResponseParser } from '../utils/ai-response-parser';
export { DiffProcessor } from '../utils/diff-processor';

// Configuration
export { default as config } from '../utils/config';

// Constants
export * from '../utils/constants';

// Types
export * from '../types';
export * from '../types/ai'; 