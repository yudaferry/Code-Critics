# GitHub Webhooks Research

## Overview
Research on GitHub webhook events, payloads, security, and implementation patterns for Code Critics project.

## Webhook Events for Code Review

### Pull Request Events
**Event Type**: `pull_request`
**Relevant Actions**:
- `opened` - New PR created
- `synchronize` - New commits pushed to PR
- `reopened` - Closed PR reopened

**Payload Structure**:
```json
{
  "action": "opened|synchronize|reopened",
  "number": 123,
  "pull_request": {
    "id": 1,
    "number": 123,
    "state": "open",
    "title": "PR Title",
    "body": "PR Description",
    "head": {
      "sha": "commit-sha",
      "ref": "feature-branch",
      "repo": { "full_name": "owner/repo" }
    },
    "base": {
      "sha": "base-commit-sha",
      "ref": "main",
      "repo": { "full_name": "owner/repo" }
    },
    "diff_url": "https://github.com/owner/repo/pull/123.diff",
    "patch_url": "https://github.com/owner/repo/pull/123.patch"
  },
  "repository": {
    "id": 123456,
    "name": "repo-name",
    "full_name": "owner/repo",
    "private": false
  }
}
```

### Issue Comment Events
**Event Type**: `issue_comment`
**Relevant Action**: `created`
**Trigger Pattern**: Comments containing `@codecritics`

**Payload Structure**:
```json
{
  "action": "created",
  "issue": {
    "number": 123,
    "pull_request": {
      "url": "https://api.github.com/repos/owner/repo/pulls/123"
    }
  },
  "comment": {
    "id": 456789,
    "body": "@codecritics please review this",
    "user": {
      "login": "username"
    }
  },
  "repository": {
    "full_name": "owner/repo"
  }
}
```

## Webhook Security

### Signature Verification
GitHub signs webhook payloads using HMAC-SHA256 with the webhook secret.

**Implementation Pattern**:
```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const expectedHeader = `sha256=${expectedSignature}`;
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedHeader)
  );
}
```

### Security Best Practices
1. **Always verify webhook signatures** - Prevents unauthorized requests
2. **Use timing-safe comparison** - Prevents timing attacks
3. **Validate payload structure** - Ensure required fields exist
4. **Rate limiting** - Prevent abuse of webhook endpoint
5. **HTTPS only** - GitHub requires HTTPS for webhook URLs

## Webhook Endpoint Configuration

### Express.js Implementation
```typescript
import express from 'express';
import { Webhooks } from '@octokit/webhooks';

const app = express();
const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_SECRET!
});

// Raw body parser for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

app.post('/api/webhooks', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const payload = req.body.toString();
  
  try {
    await webhooks.verifyAndReceive({
      id: req.headers['x-github-delivery'] as string,
      name: req.headers['x-github-event'] as string,
      signature,
      payload
    });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(400).send('Bad Request');
  }
});
```

### Event Filtering Strategy
```typescript
webhooks.on('pull_request.opened', async ({ payload }) => {
  await handlePullRequestReview(payload);
});

webhooks.on('pull_request.synchronize', async ({ payload }) => {
  await handlePullRequestReview(payload);
});

webhooks.on('issue_comment.created', async ({ payload }) => {
  if (payload.issue.pull_request && payload.comment.body.includes('@codecritics')) {
    await handleManualReview(payload);
  }
});
```

## Error Handling Patterns

### Webhook Delivery Failures
- GitHub retries failed webhooks with exponential backoff
- Maximum 5 retry attempts over ~8 hours
- Return appropriate HTTP status codes:
  - `200-299`: Success
  - `400-499`: Client error (don't retry)
  - `500-599`: Server error (will retry)

### Implementation
```typescript
app.post('/api/webhooks', async (req, res) => {
  try {
    await processWebhook(req);
    res.status(200).send('OK');
  } catch (error) {
    if (error instanceof ValidationError) {
      // Client error - don't retry
      res.status(400).json({ error: error.message });
    } else {
      // Server error - GitHub will retry
      console.error('Webhook processing failed:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

## Vercel Deployment Considerations

### Function Configuration
```json
// vercel.json
{
  "functions": {
    "api/webhooks.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/webhooks",
      "destination": "/api/webhooks"
    }
  ]
}
```

### Environment Variables
- `WEBHOOK_SECRET`: GitHub webhook secret
- `GITHUB_TOKEN`: Personal access token
- `GEMINI_API_KEY`: AI service key
- `DEEPSEEK_API_KEY`: Backup AI service key

## References

1. **GitHub Webhooks Documentation**: https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks
2. **GitHub Webhook Events Reference**: https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads
3. **@octokit/webhooks Library**: https://github.com/octokit/webhooks.js
4. **Vercel Serverless Functions**: https://vercel.com/docs/concepts/functions/serverless-functions
5. **GitHub Webhook Security**: https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
6. **Express.js Raw Body Parser**: https://expressjs.com/en/api.html#express.raw
7. **Node.js Crypto Module**: https://nodejs.org/api/crypto.html#crypto_crypto_timingsafeequal_a_b