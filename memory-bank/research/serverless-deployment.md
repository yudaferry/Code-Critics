# Serverless Deployment Research

## Overview
Research on Vercel serverless deployment patterns, optimization techniques, and configuration strategies for the Code Critics webhook application.

## Vercel Serverless Functions

### Function Configuration
```json
// vercel.json
{
  "version": 2,
  "functions": {
    "api/webhooks.js": {
      "maxDuration": 30,
      "memory": 1024,
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/webhooks",
      "destination": "/api/webhooks"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Delivery"
        }
      ]
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Function Limits and Constraints
- **Execution Time**: 30 seconds max (configurable up to 900s on Pro plan)
- **Memory**: 1024MB default (configurable up to 3008MB)
- **Payload Size**: 4.5MB max for request body
- **Cold Start**: 1-3 seconds typical for Node.js functions
- **Concurrent Executions**: 1000 per deployment (Pro plan)

### File Structure for Vercel
```
project/
├── api/
│   ├── webhooks.ts          # Main webhook handler
│   └── health.ts            # Health check endpoint
├── src/
│   ├── services/
│   │   ├── github.ts        # GitHub API client
│   │   ├── ai/
│   │   │   ├── gemini.ts    # Gemini client
│   │   │   └── deepseek.ts  # DeepSeek client
│   │   └── review.ts        # Review orchestration
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── vercel.json              # Deployment configuration
└── package.json
```

## Cold Start Optimization

### Minimize Bundle Size
```typescript
// Use dynamic imports for heavy dependencies
async function getAIClient(provider: 'gemini' | 'deepseek') {
  if (provider === 'gemini') {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  } else {
    const axios = await import('axios');
    return createDeepSeekClient(axios.default);
  }
}
```

### Connection Pooling
```typescript
// Reuse HTTP connections
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// Use with axios
const axiosInstance = axios.create({
  httpsAgent,
  timeout: 30000
});
```

### Global Variable Caching
```typescript
// Cache clients in global scope to survive across invocations
declare global {
  var __octokit: Octokit | undefined;
  var __geminiClient: any | undefined;
}

function getOctokitClient(): Octokit {
  if (!global.__octokit) {
    global.__octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'code-critics/1.0.0'
    });
  }
  return global.__octokit;
}
```

### Lazy Initialization
```typescript
class LazyAIService {
  private _geminiClient?: any;
  private _deepseekClient?: any;
  
  async getGeminiClient() {
    if (!this._geminiClient) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this._geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    }
    return this._geminiClient;
  }
  
  async getDeepSeekClient() {
    if (!this._deepseekClient) {
      const axios = await import('axios');
      this._deepseekClient = this.createDeepSeekClient(axios.default);
    }
    return this._deepseekClient;
  }
}
```

## Environment Variables Management

### Vercel Environment Variables
```bash
# Production environment variables (set in Vercel dashboard)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=your_webhook_secret_here
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
NODE_ENV=production

# Optional configuration
AI_PROVIDER=gemini  # Primary AI provider
MAX_DIFF_SIZE=100000  # Max diff size in characters
ENABLE_CACHING=true
LOG_LEVEL=info
```

### Environment Variable Validation
```typescript
import { z } from 'zod';

const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  WEBHOOK_SECRET: z.string().min(1, 'Webhook secret is required'),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['gemini', 'deepseek']).default('gemini'),
  MAX_DIFF_SIZE: z.string().transform(Number).default('100000'),
  ENABLE_CACHING: z.string().transform(val => val === 'true').default('true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export const env = envSchema.parse(process.env);

// Validate AI provider availability
if (env.AI_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required when AI_PROVIDER is gemini');
}

if (env.AI_PROVIDER === 'deepseek' && !env.DEEPSEEK_API_KEY) {
  throw new Error('DEEPSEEK_API_KEY is required when AI_PROVIDER is deepseek');
}
```

## Error Handling and Monitoring

### Structured Logging
```typescript
interface LogContext {
  requestId?: string;
  repository?: string;
  pullNumber?: number;
  provider?: string;
  duration?: number;
  error?: Error;
}

class Logger {
  private context: LogContext = {};
  
  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }
  
  info(message: string, extra?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...extra
    }));
  }
  
  error(message: string, error?: Error, extra?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...this.context,
      ...extra
    }));
  }
}
```

### Health Check Endpoint
```typescript
// api/health.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  try {
    // Check environment variables
    const requiredEnvVars = ['GITHUB_TOKEN', 'WEBHOOK_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(500).json({
        status: 'error',
        message: `Missing environment variables: ${missingVars.join(', ')}`
      });
    }
    
    // Check AI service availability
    const aiStatus = await checkAIServices();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        github: 'ok',
        ai: aiStatus
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown'
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({
      status: 'error',
      message: error.message,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
}

async function checkAIServices(): Promise<Record<string, string>> {
  const status: Record<string, string> = {};
  
  // Check Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('test');
      status.gemini = 'ok';
    } catch (error) {
      status.gemini = 'error';
    }
  } else {
    status.gemini = 'not_configured';
  }
  
  // Check DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const axios = await import('axios');
      await axios.default.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-coder',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      status.deepseek = 'ok';
    } catch (error) {
      status.deepseek = error.response?.status === 401 ? 'auth_error' : 'error';
    }
  } else {
    status.deepseek = 'not_configured';
  }
  
  return status;
}
```

## Performance Monitoring

### Request Timing
```typescript
class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Record<string, number> = {};
  
  constructor() {
    this.startTime = Date.now();
  }
  
  checkpoint(name: string) {
    this.checkpoints[name] = Date.now() - this.startTime;
  }
  
  getMetrics() {
    return {
      totalDuration: Date.now() - this.startTime,
      checkpoints: this.checkpoints
    };
  }
}

// Usage in webhook handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const monitor = new PerformanceMonitor();
  
  try {
    // Verify webhook
    monitor.checkpoint('webhook_verified');
    
    // Fetch PR data
    const prData = await fetchPRData();
    monitor.checkpoint('pr_data_fetched');
    
    // Analyze with AI
    const analysis = await analyzeCode(prData.diff);
    monitor.checkpoint('ai_analysis_complete');
    
    // Post comments
    await postComments(analysis);
    monitor.checkpoint('comments_posted');
    
    const metrics = monitor.getMetrics();
    console.log('Performance metrics:', metrics);
    
    res.status(200).json({ status: 'success', metrics });
  } catch (error) {
    const metrics = monitor.getMetrics();
    console.error('Request failed:', { error: error.message, metrics });
    res.status(500).json({ error: error.message, metrics });
  }
}
```

### Memory Usage Monitoring
```typescript
function logMemoryUsage(context: string) {
  const usage = process.memoryUsage();
  console.log(`Memory usage (${context}):`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}
```

## Deployment Strategies

### Continuous Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Run tests
        run: yarn test
      
      - name: Build
        run: yarn build
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment-specific Deployments
```json
// vercel.json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  },
  "github": {
    "autoAlias": false
  },
  "alias": ["code-critics.vercel.app"]
}
```

### Preview Deployments
```typescript
// Use different configurations for preview deployments
const isPreview = process.env.VERCEL_ENV === 'preview';
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  logLevel: isPreview || isDevelopment ? 'debug' : 'info',
  enableCaching: !isDevelopment,
  aiProvider: isPreview ? 'gemini' : process.env.AI_PROVIDER || 'gemini'
};
```

## Security Considerations

### CORS Configuration
```typescript
function setCORSHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://github.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256, X-GitHub-Event');
  res.setHeader('Access-Control-Max-Age', '86400');
}
```

### Rate Limiting
```typescript
import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 1000 * 60 * 15 // 15 minutes
});

function checkRateLimit(identifier: string, limit: number = 10): boolean {
  const current = rateLimitCache.get(identifier) || 0;
  
  if (current >= limit) {
    return false;
  }
  
  rateLimitCache.set(identifier, current + 1);
  return true;
}
```

### Input Validation
```typescript
import { z } from 'zod';

const webhookPayloadSchema = z.object({
  action: z.string(),
  repository: z.object({
    full_name: z.string(),
    private: z.boolean()
  }),
  pull_request: z.object({
    number: z.number(),
    diff_url: z.string().url()
  }).optional(),
  issue: z.object({
    number: z.number(),
    pull_request: z.object({
      url: z.string().url()
    }).optional()
  }).optional()
});

function validateWebhookPayload(payload: any) {
  return webhookPayloadSchema.parse(payload);
}
```

## References

1. **Vercel Serverless Functions Documentation**: https://vercel.com/docs/concepts/functions/serverless-functions
2. **Vercel Configuration Reference**: https://vercel.com/docs/project-configuration
3. **Node.js Performance Best Practices**: https://nodejs.org/en/docs/guides/simple-profiling/
4. **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
5. **Cold Start Optimization**: https://vercel.com/blog/how-to-optimize-serverless-functions
6. **Vercel Limits and Pricing**: https://vercel.com/docs/concepts/limits/overview
7. **GitHub Webhook Best Practices**: https://docs.github.com/en/developers/webhooks-and-events/webhooks/best-practices-for-webhooks
8. **Serverless Security Guide**: https://github.com/puresec/awesome-serverless-security