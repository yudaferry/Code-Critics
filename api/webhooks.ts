import { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhooks } from '@octokit/webhooks';
import { handlePullRequestEvent, handleIssueCommentEvent } from '../src/services/webhook-handlers';
import { verifyWebhookSignature, validateWebhookPayload } from '../src/utils/webhook-security';
import { Logger } from '../src/utils/logger';
import config from '../src/utils/config';

const logger = new Logger();

// Initialize webhooks handler
const webhooks = new Webhooks({
  secret: config.WEBHOOK_SECRET
});

// Register event handlers
webhooks.on('pull_request.opened', handlePullRequestEvent);
webhooks.on('pull_request.synchronize', handlePullRequestEvent);
webhooks.on('pull_request.reopened', handlePullRequestEvent);
webhooks.on('issue_comment.created', handleIssueCommentEvent);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const delivery = req.headers['x-github-delivery'] as string;
  
  logger.setContext({ 
    requestId: delivery,
    event,
    userAgent: req.headers['user-agent']
  });

  logger.info('Webhook request received', {
    event,
    hasSignature: !!signature,
    contentLength: req.headers['content-length']
  });

  try {
    // Verify webhook signature
    const payload = JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(payload, signature)) {
      logger.warn('Webhook signature verification failed');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      });
    }

    // Validate payload structure
    const validation = validateWebhookPayload(req.body);
    if (!validation.isValid) {
      logger.warn('Invalid webhook payload', { errors: validation.errors });
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Invalid payload structure',
        details: validation.errors
      });
    }

    // Process webhook using Octokit webhooks library
    await webhooks.verifyAndReceive({
      id: delivery,
      name: event,
      signature,
      payload
    });

    logger.info('Webhook processed successfully');
    res.status(200).json({ 
      status: 'success',
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    logger.error('Webhook processing failed', error);
    
    // Determine appropriate error response
    if (error.message?.includes('signature')) {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid signature'
      });
    } else if (error.message?.includes('rate limit')) {
      res.status(429).json({ 
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      });
    } else if (error.message?.includes('not found')) {
      res.status(404).json({ 
        error: 'Not Found',
        message: 'Resource not found'
      });
    } else {
      // Generic server error
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to process webhook'
      });
    }
  }
}