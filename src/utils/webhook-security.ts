import crypto from 'crypto';
import { Logger } from './logger';
import config from './config';

const logger = new Logger();

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string = config.WEBHOOK_SECRET
): boolean {
  if (!signature) {
    logger.warn('No signature provided in webhook request');
    return false;
  }

  if (!signature.startsWith('sha256=')) {
    logger.warn('Invalid signature format', { signature: signature.substring(0, 20) });
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const expectedHeader = `sha256=${expectedSignature}`;
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedHeader);
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      logger.warn('Signature length mismatch');
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    
    if (!isValid) {
      logger.warn('Webhook signature verification failed');
    }
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature', error);
    return false;
  }
}

/**
 * Rate limiting cache for repositories
 */
class RateLimitCache {
  private cache = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60 * 60 * 1000) { // 10 requests per hour
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.cache.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        identifier, 
        count: entry.count, 
        maxRequests: this.maxRequests 
      });
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.cache.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.cache.get(identifier);
    return entry?.resetTime || Date.now();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }
}

// Global rate limiter instance
export const repositoryRateLimit = new RateLimitCache();

// Clean up rate limit cache every hour
setInterval(() => {
  repositoryRateLimit.cleanup();
}, 60 * 60 * 1000);

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return { isValid: false, errors };
  }

  if (!payload.action || typeof payload.action !== 'string') {
    errors.push('Missing or invalid action field');
  }

  if (!payload.repository || typeof payload.repository !== 'object') {
    errors.push('Missing or invalid repository field');
  } else {
    if (!payload.repository.full_name || typeof payload.repository.full_name !== 'string') {
      errors.push('Missing or invalid repository.full_name field');
    }
  }

  // Validate pull_request events
  if (payload.action && ['opened', 'synchronize', 'reopened'].includes(payload.action)) {
    if (!payload.pull_request || typeof payload.pull_request !== 'object') {
      errors.push('Missing or invalid pull_request field for pull request event');
    } else {
      if (typeof payload.pull_request.number !== 'number') {
        errors.push('Missing or invalid pull_request.number field');
      }
      if (!payload.pull_request.diff_url || typeof payload.pull_request.diff_url !== 'string') {
        errors.push('Missing or invalid pull_request.diff_url field');
      }
    }
  }

  // Validate issue_comment events
  if (payload.action === 'created' && payload.issue) {
    if (!payload.comment || typeof payload.comment !== 'object') {
      errors.push('Missing or invalid comment field for comment event');
    } else {
      if (!payload.comment.body || typeof payload.comment.body !== 'string') {
        errors.push('Missing or invalid comment.body field');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract repository information from webhook payload
 */
export function extractRepositoryInfo(payload: any): {
  owner: string;
  repo: string;
  fullName: string;
} {
  const repository = payload.repository;
  return {
    owner: repository.owner.login,
    repo: repository.name,
    fullName: repository.full_name
  };
}

/**
 * Check if the webhook event should be processed
 */
export function shouldProcessEvent(payload: any): {
  shouldProcess: boolean;
  reason?: string;
} {
  // Check if it's a pull request event we care about
  if (payload.pull_request) {
    const validActions = ['opened', 'synchronize', 'reopened'];
    if (!validActions.includes(payload.action)) {
      return {
        shouldProcess: false,
        reason: `Pull request action '${payload.action}' not supported`
      };
    }
    return { shouldProcess: true };
  }

  // Check if it's a comment event with bot mention
  if (payload.issue && payload.comment && payload.action === 'created') {
    // Only process if it's on a PR and mentions the bot
    if (!payload.issue.pull_request) {
      return {
        shouldProcess: false,
        reason: 'Comment is not on a pull request'
      };
    }

    if (!payload.comment.body.includes('@codecritics')) {
      return {
        shouldProcess: false,
        reason: 'Comment does not mention @codecritics'
      };
    }

    return { shouldProcess: true };
  }

  return {
    shouldProcess: false,
    reason: 'Event type not supported'
  };
}