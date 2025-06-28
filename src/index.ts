import express from 'express';
import { Request, Response } from 'express';
import { GitHubService } from './services/github';
import { Logger } from './utils/logger';
import config from './utils/config';

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
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`, {
      environment: process.env.NODE_ENV,
      aiProvider: config.AI_PROVIDER
    });
  });
}

export default app; 