/**
 * @fileoverview Main Express server for Code Critics GitHub webhook handler
 * 
 * This file sets up the Express server that handles GitHub webhooks for
 * automated code review using AI services (Gemini/DeepSeek). It provides
 * endpoints for health checks, webhook processing, and API information.
 * 
 * @author Code Critics Team
 * @version 1.0.0
 */

import 'dotenv/config';
import express from 'express';
import { Request, Response } from 'express';
import { container } from './core/container';
import config from './utils/config';
import { verifyWebhookSignature, sanitizeWebhookPayload, sanitizeHeaders } from './utils/webhook-security';

/**
 * Express application instance
 */
const app = express();

/**
 * Server port configuration
 */
const port = process.env.PORT || 3000;

/**
 * Service instances from dependency injection container
 */
const githubService = container.getGitHubService();
const codeReviewService = container.getCodeReviewService();
const logger = container.getLogger();

/**
 * Health check endpoint with comprehensive service validation
 * 
 * Performs validation of:
 * - Environment variables
 * - GitHub API connectivity
 * - Rate limit status
 * - Service configuration
 * 
 * @route GET /health
 * @returns {Object} Health status with service details
 */
app.get('/health', async (_req, res) => {
  const startTime = Date.now();

  try {
    // Check environment variables
    const requiredEnvVars = ['GITHUB_TOKEN', 'WEBHOOK_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      res.status(500).json({
        status: 'error',
        message: `Missing environment variables: ${missingVars.join(', ')}`
      });
      return;
    }

    // Check GitHub API connectivity
    let githubStatus = 'ok';
    let githubUser = null;

    try {
      githubUser = await githubService.validateToken();
    } catch (error) {
      githubStatus = 'error';
      logger.error('GitHub API health check failed', error as Error);
    }

    // Check rate limits
    let rateLimitInfo = null;
    try {
      rateLimitInfo = await githubService.checkRateLimit();
    } catch (error) {
      logger.warn('Could not fetch rate limit info', error as Record<string, any>);
    }

    const responseTime = Date.now() - startTime;

    const healthData = {
      status: githubStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        github: {
          status: githubStatus,
          user: githubUser?.login,
          rateLimit: rateLimitInfo ? {
            remaining: rateLimitInfo.remaining,
            limit: rateLimitInfo.limit,
            reset: rateLimitInfo.reset
          } : null
        }
      },
      config: {
        aiProvider: config.AI_PROVIDER,
        maxDiffSize: config.MAX_DIFF_SIZE,
        logLevel: config.LOG_LEVEL,
        allowedRepositories: config.ALLOWED_REPOSITORIES ? 'configured' : 'all'
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown'
    };

    res.status(githubStatus === 'ok' ? 200 : 503).json(healthData);
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Health check failed', error as Error);

    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API information endpoint
 * 
 * Provides basic information about the Code Critics API including
 * available endpoints and documentation links.
 * 
 * @route GET /api/info
 * @returns {Object} API information and available endpoints
 */
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    name: 'Code Critics',
    version: '1.0.0',
    description: 'AI-powered GitHub code review application',
    endpoints: {
      health: '/health',
      webhooks: '/api/webhooks'
    },
    documentation: 'https://github.com/your-username/code-critics'
  });
});

/**
 * GitHub webhook endpoint for processing pull request and issue comment events
 * 
 * This endpoint handles GitHub webhooks for:
 * - Pull request events (opened, reopened, synchronize)
 * - Issue comment events (manual review requests via @codecritics)
 * 
 * Security features:
 * - Webhook signature verification
 * - Payload sanitization
 * - Rate limiting
 * - Asynchronous processing
 * 
 * @route POST /api/webhooks
 * @param {Object} req.body - GitHub webhook payload
 * @param {string} req.headers.x-hub-signature-256 - Webhook signature
 * @param {string} req.headers.x-github-event - Event type
 * @param {string} req.headers.x-github-delivery - Delivery ID
 * @returns {Object} Processing status
 */
app.post('/api/webhooks', express.json({ limit: '10mb' }), (req: Request, res: Response): void => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const delivery = req.headers['x-github-delivery'] as string;

  // Asynchronously log webhook data to avoid blocking
  setImmediate(() => {
    const sanitizedBody = sanitizeWebhookPayload(req.body);
    logger.info('Received webhook', {
      event,
      delivery,
      headers: sanitizeHeaders(req.headers),
      body: JSON.stringify(sanitizedBody).substring(0, 500)
    });
  });

  // Verify webhook signature for security
  if (!verifyWebhookSignature(JSON.stringify(req.body), signature, process.env.WEBHOOK_SECRET!)) {
    logger.warn('Invalid webhook signature', { delivery, event });
    res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    return;
  }

  switch (event) {
    case 'ping':
      logger.info('Received ping event', {
        zen: req.body.zen,
        hook_id: req.body.hook_id,
        repository: req.body.repository?.full_name
      });
      res.status(200).json({ message: 'Pong!' });
      break;

    case 'pull_request':
      logger.info('Received pull request event', {
        action: req.body.action,
        repo: req.body.repository?.full_name,
        pr: req.body.pull_request?.number,
        title: req.body.pull_request?.title,
        author: req.body.pull_request?.user?.login
      });

      const pullRequest = req.body.pull_request;
      const action = req.body.action;

      if (action === 'opened' || action === 'reopened' || action === 'synchronize') {
        // 'synchronize' event occurs when new commits are pushed to the PR branch
        const owner = pullRequest.base.repo.owner.login;
        const repo = pullRequest.base.repo.name;
        const pullNumber = pullRequest.number;

        // Asynchronously conduct the review to not block the webhook response
        codeReviewService.conductReview(owner, repo, pullNumber).catch(error => {
          logger.error('Error conducting code review', error as Error, { owner, repo, pullNumber });
        });

        res.status(202).json({ message: 'Pull request event received, review initiated' });
      } else {
        res.status(202).json({ message: `Pull request event action '${action}' not handled` });
      }
      break;

    case 'issue_comment':
      logger.info('Received issue comment event', {
        repo: req.body.repository?.full_name,
        issue: req.body.issue?.number,
        comment: req.body.comment?.body?.substring(0, 100),
        author: req.body.comment?.user?.login
      });

      // Check if this is a comment on a PR and mentions @codecritics
      const issue = req.body.issue;
      const comment = req.body.comment;

      if (issue && issue.pull_request && comment && comment.body &&
        comment.body.toLowerCase().includes('@codecritics')) {

        logger.info('Manual code review requested via comment', {
          repo: req.body.repository.full_name,
          pr: issue.number,
          commenter: comment.user.login
        });

        const owner = req.body.repository.owner.login;
        const repo = req.body.repository.name;
        const pullNumber = issue.number;

        // Asynchronously conduct the review to not block the webhook response
        codeReviewService.conductReview(owner, repo, pullNumber).catch(error => {
          logger.error('Error conducting manual code review', error as Error, {
            owner,
            repo,
            pullNumber,
            commenter: comment.user.login
          });
        });

        res.status(202).json({ message: 'Manual code review requested, review initiated' });
      } else {
        res.status(202).json({ message: 'Issue comment event received, no action taken' });
      }
      break;

    default:
      logger.info('Received unsupported event', { event, delivery });
      res.status(202).json({ message: `Event type '${event}' is not supported` });
  }
});

/**
 * Global error handling middleware
 * 
 * Catches and handles any unhandled errors in the Express application.
 * Provides different error details based on the environment.
 * 
 * @param {Error} error - The error that occurred
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @param {Function} _next - Express next function (unused)
 */
app.use((error: Error, _req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error in Express app', error);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

/**
 * 404 handler for unmatched routes
 * 
 * Handles requests to non-existent endpoints with a proper 404 response.
 * 
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

/**
 * Start the server for local development
 * 
 * Only starts the server when not in a serverless environment.
 * Logs startup information including configuration details.
 */
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    aiProvider: config.AI_PROVIDER
  });
});

/**
 * Export the Express app for serverless deployment
 */
export default app; 