/**
 * Review Domain Module
 * 
 * This module encapsulates all code review-related functionality including
 * the main review service, diff processing, and review orchestration.
 */

// Core review service
export { CodeReviewService } from '../../services/code-reviewer';

// Review utilities
export { DiffProcessor } from '../../utils/diff-processor';

// Review-specific types
export type {
  CodeReviewResult,
  ReviewComment,
  ReviewRequest,
  ReviewStatus
} from '../../types'; 