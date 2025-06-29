import 'dotenv/config';
import express from 'express';
import { Request, Response } from 'express';
import { GitHubService } from './services/github';
import { Logger } from './utils/logger';
import config from './utils/config';
import { verifyWebhookSignature } from './utils/webhook-security';

const app = express();
const port = process.env.PORT || 3000;
const logger = new Logger();

// Middleware for JSON parsing with larger payload limit
app.use(express.json({ limit: '10mb' }));

// Health check endpoint with service validation
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
    const githubService = new GitHubService();
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

// API info endpoint
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

// GitHub webhook endpoint
app.post('/api/webhooks', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const delivery = req.headers['x-github-delivery'] as string;

  logger.info('Received webhook', {
    event,
    delivery,
    headers: req.headers,
    body: JSON.stringify(req.body).substring(0, 1000)
  });

  logger.info('Webhook signature verification bypassed for testing');

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
      res.status(202).json({ message: 'Pull request event received' });
      break;

    case 'issue_comment':
      logger.info('Received issue comment event', {
        repo: req.body.repository?.full_name,
        issue: req.body.issue?.number,
        comment: req.body.comment?.body?.substring(0, 100),
        author: req.body.comment?.user?.login
      });
      res.status(202).json({ message: 'Issue comment event received' });
      break;

    default:
      logger.info('Received unsupported event', { event, delivery });
      res.status(202).json({ message: `Event type '${event}' is not supported` });
  }
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error in Express app', error);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// For local development
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    aiProvider: config.AI_PROVIDER
  });
});

export default app; 