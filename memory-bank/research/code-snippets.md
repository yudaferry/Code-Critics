# Code Snippets and Implementation Examples

## Overview
Reusable code examples and implementation patterns for the Code Critics project, organized by functionality.

## Webhook Handler Implementation

### Main Webhook Entry Point
```typescript
// api/webhooks.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhooks } from '@octokit/webhooks';
import { handlePullRequestEvent, handleIssueCommentEvent } from '../src/services/webhook-handlers';
import { Logger } from '../src/utils/logger';

const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_SECRET!
});

const logger = new Logger();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const delivery = req.headers['x-github-delivery'] as string;
  
  logger.setContext({ 
    requestId: delivery,
    event 
  });

  try {
    const payload = JSON.stringify(req.body);
    
    await webhooks.verifyAndReceive({
      id: delivery,
      name: event,
      signature,
      payload
    });

    logger.info('Webhook processed successfully');
    res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error('Webhook processing failed', error);
    
    if (error.message.includes('signature')) {
      res.status(401).json({ error: 'Invalid signature' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Event handlers
webhooks.on('pull_request.opened', handlePullRequestEvent);
webhooks.on('pull_request.synchronize', handlePullRequestEvent);
webhooks.on('pull_request.reopened', handlePullRequestEvent);
webhooks.on('issue_comment.created', handleIssueCommentEvent);
```

### Event Handler Services
```typescript
// src/services/webhook-handlers.ts
import { EmitterWebhookEvent } from '@octokit/webhooks';
import { ReviewService } from './review';
import { Logger } from '../utils/logger';

const reviewService = new ReviewService();
const logger = new Logger();

export async function handlePullRequestEvent(
  event: EmitterWebhookEvent<'pull_request.opened' | 'pull_request.synchronize' | 'pull_request.reopened'>
) {
  const { payload } = event;
  const { repository, pull_request } = payload;
  
  logger.setContext({
    repository: repository.full_name,
    pullNumber: pull_request.number
  });

  logger.info('Processing pull request event', {
    action: payload.action,
    title: pull_request.title
  });

  try {
    await reviewService.reviewPullRequest({
      owner: repository.owner.login,
      repo: repository.name,
      pullNumber: pull_request.number,
      diffUrl: pull_request.diff_url
    });
  } catch (error) {
    logger.error('Failed to review pull request', error);
    throw error;
  }
}

export async function handleIssueCommentEvent(
  event: EmitterWebhookEvent<'issue_comment.created'>
) {
  const { payload } = event;
  const { repository, issue, comment } = payload;

  // Only process comments on PRs that mention the bot
  if (!issue.pull_request || !comment.body.includes('@codecritics')) {
    return;
  }

  logger.setContext({
    repository: repository.full_name,
    pullNumber: issue.number
  });

  logger.info('Processing manual review request', {
    commenter: comment.user.login,
    comment: comment.body.substring(0, 100)
  });

  try {
    await reviewService.reviewPullRequest({
      owner: repository.owner.login,
      repo: repository.name,
      pullNumber: issue.number,
      isManualTrigger: true
    });
  } catch (error) {
    logger.error('Failed to process manual review', error);
    throw error;
  }
}
```

## GitHub API Service

### GitHub Client Service
```typescript
// src/services/github.ts
import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger';

export interface PullRequestData {
  number: number;
  title: string;
  body: string;
  diff: string;
  files: Array<{
    filename: string;
    status: string;
    patch?: string;
  }>;
}

export class GitHubService {
  private octokit: Octokit;
  private logger = new Logger();

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'code-critics/1.0.0'
    });
  }

  async getPullRequestData(
    owner: string,
    repo: string,
    pullNumber: number,
    diffUrl?: string
  ): Promise<PullRequestData> {
    this.logger.info('Fetching pull request data');

    // Get PR details
    const { data: pr } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber
    });

    // Get changed files
    const { data: files } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber
    });

    // Get diff
    let diff: string;
    if (diffUrl) {
      const response = await fetch(diffUrl, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.diff'
        }
      });
      diff = await response.text();
    } else {
      const { data: diffData } = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: pr.base.sha,
        head: pr.head.sha,
        mediaType: { format: 'diff' }
      });
      diff = diffData as unknown as string;
    }

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      diff,
      files: files.map(file => ({
        filename: file.filename,
        status: file.status,
        patch: file.patch
      }))
    };
  }

  async postReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    comment: {
      path: string;
      line: number;
      body: string;
    }
  ): Promise<void> {
    await this.octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      body: comment.body,
      path: comment.path,
      line: comment.line
    });
  }

  async postPRComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
  ): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body
    });
  }

  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    review: {
      body: string;
      event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
      comments: Array<{
        path: string;
        line: number;
        body: string;
      }>;
    }
  ): Promise<void> {
    await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      body: review.body,
      event: review.event,
      comments: review.comments
    });
  }

  async findExistingBotComments(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{ id: number; body: string }>> {
    const { data: comments } = await this.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pullNumber
    });

    return comments
      .filter(comment => 
        comment.user?.login === 'code-critics[bot]' ||
        comment.body.includes('<!-- code-critics-comment -->')
      )
      .map(comment => ({
        id: comment.id,
        body: comment.body
      }));
  }
}
```

## AI Service Implementation

### AI Service Manager
```typescript
// src/services/ai/ai-service.ts
import { GeminiClient } from './gemini';
import { DeepSeekClient } from './deepseek';
import { Logger } from '../../utils/logger';

export interface CodeReviewResult {
  type: 'bug' | 'security';
  severity: 'critical' | 'high';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface AIClient {
  analyzeCode(diff: string): Promise<CodeReviewResult[]>;
  isAvailable(): Promise<boolean>;
  getModelInfo(): { name: string; provider: string };
}

export class AIService {
  private primaryClient: AIClient;
  private secondaryClient?: AIClient;
  private logger = new Logger();

  constructor() {
    const primaryProvider = process.env.AI_PROVIDER || 'gemini';
    
    if (primaryProvider === 'gemini' && process.env.GEMINI_API_KEY) {
      this.primaryClient = new GeminiClient(process.env.GEMINI_API_KEY);
      
      if (process.env.DEEPSEEK_API_KEY) {
        this.secondaryClient = new DeepSeekClient(process.env.DEEPSEEK_API_KEY);
      }
    } else if (primaryProvider === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
      this.primaryClient = new DeepSeekClient(process.env.DEEPSEEK_API_KEY);
      
      if (process.env.GEMINI_API_KEY) {
        this.secondaryClient = new GeminiClient(process.env.GEMINI_API_KEY);
      }
    } else {
      throw new Error('No AI provider configured');
    }
  }

  async analyzeCode(diff: string): Promise<{
    results: CodeReviewResult[];
    provider: string;
  }> {
    this.logger.info('Starting code analysis', {
      diffSize: diff.length,
      primaryProvider: this.primaryClient.getModelInfo().provider
    });

    try {
      const results = await this.primaryClient.analyzeCode(diff);
      
      this.logger.info('Code analysis completed', {
        provider: this.primaryClient.getModelInfo().provider,
        findingsCount: results.length
      });

      return {
        results,
        provider: this.primaryClient.getModelInfo().provider
      };
    } catch (error) {
      this.logger.error('Primary AI service failed', error);

      if (this.secondaryClient) {
        this.logger.info('Attempting fallback to secondary provider');
        
        try {
          const results = await this.secondaryClient.analyzeCode(diff);
          
          this.logger.info('Fallback analysis completed', {
            provider: this.secondaryClient.getModelInfo().provider,
            findingsCount: results.length
          });

          return {
            results,
            provider: this.secondaryClient.getModelInfo().provider
          };
        } catch (fallbackError) {
          this.logger.error('Secondary AI service also failed', fallbackError);
        }
      }

      throw new Error('All AI services unavailable');
    }
  }

  async checkAvailability(): Promise<{
    primary: boolean;
    secondary: boolean;
  }> {
    const [primaryAvailable, secondaryAvailable] = await Promise.all([
      this.primaryClient.isAvailable().catch(() => false),
      this.secondaryClient?.isAvailable().catch(() => false) || Promise.resolve(false)
    ]);

    return {
      primary: primaryAvailable,
      secondary: secondaryAvailable
    };
  }
}
```

### Gemini Client Implementation
```typescript
// src/services/ai/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIClient, CodeReviewResult } from './ai-service';
import { Logger } from '../../utils/logger';

export class GeminiClient implements AIClient {
  private model: any;
  private logger = new Logger();

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 4096,
      }
    });
  }

  async analyzeCode(diff: string): Promise<CodeReviewResult[]> {
    const prompt = this.buildPrompt(diff);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseResponse(text);
    } catch (error) {
      this.logger.error('Gemini API error', error);
      throw new Error(`Gemini analysis failed: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.model.generateContent('test');
      return true;
    } catch (error) {
      return false;
    }
  }

  getModelInfo() {
    return {
      name: 'Gemini 1.5 Flash',
      provider: 'gemini'
    };
  }

  private buildPrompt(diff: string): string {
    return `You are an expert code reviewer focusing ONLY on critical bugs and security vulnerabilities.

ANALYSIS SCOPE:
- Critical bugs that could cause crashes, data loss, or incorrect behavior
- Security vulnerabilities (injection attacks, authentication issues, data exposure)
- Memory leaks and resource management issues
- Race conditions and concurrency problems

DO NOT REPORT:
- Style issues or formatting
- Minor optimizations
- Subjective preferences
- Documentation issues

OUTPUT FORMAT:
Return a JSON array of findings. Each finding must include:
{
  "type": "bug" | "security",
  "severity": "critical" | "high",
  "file": "path/to/file.js",
  "line": 42,
  "title": "Brief description",
  "description": "Detailed explanation of the issue",
  "suggestion": "How to fix it"
}

If no critical issues found, return: []

CODE DIFF TO ANALYZE:
\`\`\`diff
${diff}
\`\`\`

Analyze the above code diff and return findings in JSON format:`;
  }

  private parseResponse(text: string): CodeReviewResult[] {
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanText);
      
      if (!Array.isArray(parsed)) {
        this.logger.error('Response is not an array', { response: cleanText });
        return [];
      }
      
      // Validate each result
      return parsed.filter(this.validateResult);
    } catch (error) {
      this.logger.error('Failed to parse Gemini response', { 
        error: error.message, 
        response: text.substring(0, 500) 
      });
      return [];
    }
  }

  private validateResult(result: any): result is CodeReviewResult {
    return (
      typeof result === 'object' &&
      ['bug', 'security'].includes(result.type) &&
      ['critical', 'high'].includes(result.severity) &&
      typeof result.file === 'string' &&
      typeof result.line === 'number' &&
      typeof result.title === 'string' &&
      typeof result.description === 'string' &&
      typeof result.suggestion === 'string'
    );
  }
}
```

## Review Service Orchestration

### Main Review Service
```typescript
// src/services/review.ts
import { GitHubService, PullRequestData } from './github';
import { AIService, CodeReviewResult } from './ai/ai-service';
import { Logger } from '../utils/logger';

export interface ReviewRequest {
  owner: string;
  repo: string;
  pullNumber: number;
  diffUrl?: string;
  isManualTrigger?: boolean;
}

export class ReviewService {
  private githubService = new GitHubService();
  private aiService = new AIService();
  private logger = new Logger();

  async reviewPullRequest(request: ReviewRequest): Promise<void> {
    const { owner, repo, pullNumber, diffUrl, isManualTrigger } = request;
    
    this.logger.setContext({
      repository: `${owner}/${repo}`,
      pullNumber
    });

    this.logger.info('Starting pull request review', {
      isManualTrigger: !!isManualTrigger
    });

    try {
      // Check if we should skip this review
      if (!isManualTrigger && await this.shouldSkipReview(owner, repo, pullNumber)) {
        this.logger.info('Skipping review - already reviewed');
        return;
      }

      // Fetch PR data
      const prData = await this.githubService.getPullRequestData(
        owner, 
        repo, 
        pullNumber, 
        diffUrl
      );

      // Check diff size
      if (prData.diff.length > 100000) {
        await this.postSizeWarning(owner, repo, pullNumber);
        return;
      }

      // Analyze code with AI
      const { results, provider } = await this.aiService.analyzeCode(prData.diff);

      // Post review results
      await this.postReviewResults(
        owner, 
        repo, 
        pullNumber, 
        results, 
        provider,
        prData
      );

      this.logger.info('Pull request review completed', {
        findingsCount: results.length,
        provider
      });

    } catch (error) {
      this.logger.error('Pull request review failed', error);
      
      // Post error comment
      await this.postErrorComment(owner, repo, pullNumber, error);
      throw error;
    }
  }

  private async shouldSkipReview(
    owner: string, 
    repo: string, 
    pullNumber: number
  ): Promise<boolean> {
    const existingComments = await this.githubService.findExistingBotComments(
      owner, 
      repo, 
      pullNumber
    );

    // Skip if we already have a recent review comment
    return existingComments.some(comment => 
      comment.body.includes('<!-- code-critics-review -->') &&
      this.isRecentComment(comment.body)
    );
  }

  private isRecentComment(body: string): boolean {
    const timestampMatch = body.match(/<!-- timestamp: (\d+) -->/);
    if (!timestampMatch) return false;
    
    const timestamp = parseInt(timestampMatch[1]);
    const hoursSinceComment = (Date.now() - timestamp) / (1000 * 60 * 60);
    
    return hoursSinceComment < 1; // Consider recent if less than 1 hour old
  }

  private async postReviewResults(
    owner: string,
    repo: string,
    pullNumber: number,
    results: CodeReviewResult[],
    provider: string,
    prData: PullRequestData
  ): Promise<void> {
    if (results.length === 0) {
      await this.postNoIssuesComment(owner, repo, pullNumber, provider);
      return;
    }

    // Group results by file
    const resultsByFile = results.reduce((acc, result) => {
      if (!acc[result.file]) acc[result.file] = [];
      acc[result.file].push(result);
      return acc;
    }, {} as Record<string, CodeReviewResult[]>);

    // Post inline comments
    const inlineComments = [];
    for (const [file, fileResults] of Object.entries(resultsByFile)) {
      for (const result of fileResults) {
        inlineComments.push({
          path: result.file,
          line: result.line,
          body: this.formatInlineComment(result)
        });
      }
    }

    // Post review with inline comments and summary
    await this.githubService.createReview(owner, repo, pullNumber, {
      body: this.formatSummaryComment(results, provider, prData),
      event: 'COMMENT',
      comments: inlineComments
    });
  }

  private formatInlineComment(result: CodeReviewResult): string {
    const emoji = result.type === 'security' ? '🔒' : '🐛';
    const severityBadge = result.severity === 'critical' ? '🔴 CRITICAL' : '🟠 HIGH';
    
    return `${emoji} **${severityBadge}**: ${result.title}

${result.description}

**Suggestion**: ${result.suggestion}

<!-- code-critics-comment -->`;
  }

  private formatSummaryComment(
    results: CodeReviewResult[],
    provider: string,
    prData: PullRequestData
  ): string {
    const bugCount = results.filter(r => r.type === 'bug').length;
    const securityCount = results.filter(r => r.type === 'security').length;
    const criticalCount = results.filter(r => r.severity === 'critical').length;
    
    return `## 🤖 Code Critics Review

**Analysis Summary:**
- ${results.length} critical issue(s) found
- 🐛 ${bugCount} bug(s)
- 🔒 ${securityCount} security issue(s)
- 🔴 ${criticalCount} critical severity

**Files Analyzed:** ${prData.files.length}
**AI Provider:** ${provider}

${results.length > 0 ? 
  '⚠️ Please review the inline comments above and address the critical issues before merging.' : 
  '✅ No critical issues detected. Great work!'
}

---
*Powered by Code Critics AI • [Report Issues](https://github.com/your-username/code-critics/issues)*

<!-- code-critics-review -->
<!-- timestamp: ${Date.now()} -->`;
  }

  private async postNoIssuesComment(
    owner: string,
    repo: string,
    pullNumber: number,
    provider: string
  ): Promise<void> {
    const comment = `## 🤖 Code Critics Review

✅ **No critical issues detected!**

Your code looks good from a critical bug and security perspective. Great work!

**AI Provider:** ${provider}

---
*Powered by Code Critics AI • [Report Issues](https://github.com/your-username/code-critics/issues)*

<!-- code-critics-review -->
<!-- timestamp: ${Date.now()} -->`;

    await this.githubService.postPRComment(owner, repo, pullNumber, comment);
  }

  private async postSizeWarning(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<void> {
    const comment = `## 🤖 Code Critics Review

⚠️ **Pull request too large for analysis**

This pull request contains too many changes to analyze effectively. Please consider:

1. Breaking it into smaller, focused pull requests
2. Reviewing the changes manually for critical issues
3. Running local static analysis tools

**Recommendation:** Keep pull requests under 1000 lines of changes for optimal AI review.

---
*Powered by Code Critics AI*

<!-- code-critics-review -->
<!-- timestamp: ${Date.now()} -->`;

    await this.githubService.postPRComment(owner, repo, pullNumber, comment);
  }

  private async postErrorComment(
    owner: string,
    repo: string,
    pullNumber: number,
    error: Error
  ): Promise<void> {
    const comment = `## 🤖 Code Critics Review

❌ **Review failed**

Sorry, I encountered an error while analyzing this pull request:

\`${error.message}\`

Please try again later or trigger a manual review by commenting \`@codecritics\`.

---
*Powered by Code Critics AI • [Report Issues](https://github.com/your-username/code-critics/issues)*

<!-- code-critics-error -->
<!-- timestamp: ${Date.now()} -->`;

    try {
      await this.githubService.postPRComment(owner, repo, pullNumber, comment);
    } catch (commentError) {
      this.logger.error('Failed to post error comment', commentError);
    }
  }
}
```

## Utility Functions

### Logger Implementation
```typescript
// src/utils/logger.ts
export interface LogContext {
  requestId?: string;
  repository?: string;
  pullNumber?: number;
  provider?: string;
  duration?: number;
  [key: string]: any;
}

export class Logger {
  private context: LogContext = {};

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  info(message: string, extra?: Record<string, any>) {
    this.log('info', message, extra);
  }

  error(message: string, error?: Error, extra?: Record<string, any>) {
    this.log('error', message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...extra
    });
  }

  warn(message: string, extra?: Record<string, any>) {
    this.log('warn', message, extra);
  }

  debug(message: string, extra?: Record<string, any>) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, extra);
    }
  }

  private log(level: string, message: string, extra?: Record<string, any>) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...extra
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}
```

### Environment Configuration
```typescript
// src/utils/config.ts
import { z } from 'zod';

const configSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  WEBHOOK_SECRET: z.string().min(1, 'Webhook secret is required'),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['gemini', 'deepseek']).default('gemini'),
  MAX_DIFF_SIZE: z.string().transform(Number).default('100000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export const config = configSchema.parse(process.env);

// Validate AI provider configuration
if (config.AI_PROVIDER === 'gemini' && !config.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required when AI_PROVIDER is gemini');
}

if (config.AI_PROVIDER === 'deepseek' && !config.DEEPSEEK_API_KEY) {
  throw new Error('DEEPSEEK_API_KEY is required when AI_PROVIDER is deepseek');
}

export default config;
```

## Type Definitions

### Core Types
```typescript
// src/types/index.ts
export interface WebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
    private: boolean;
  };
  pull_request?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    diff_url: string;
    patch_url: string;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      sha: string;
      ref: string;
    };
  };
  issue?: {
    number: number;
    pull_request?: {
      url: string;
    };
  };
  comment?: {
    id: number;
    body: string;
    user: {
      login: string;
    };
  };
}

export interface CodeReviewResult {
  type: 'bug' | 'security';
  severity: 'critical' | 'high';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface ReviewContext {
  owner: string;
  repo: string;
  pullNumber: number;
  isManualTrigger?: boolean;
  diffUrl?: string;
}

export interface AIProviderConfig {
  name: string;
  provider: 'gemini' | 'deepseek';
  maxTokens: number;
  apiKey: string;
}
```

## References

1. **TypeScript Best Practices**: https://typescript-eslint.io/rules/
2. **Node.js Error Handling**: https://nodejs.org/api/errors.html
3. **Vercel API Routes**: https://vercel.com/docs/concepts/functions/serverless-functions
4. **GitHub Webhooks Types**: https://github.com/octokit/webhooks.js/tree/main/src/generated
5. **Express.js Error Handling**: https://expressjs.com/en/guide/error-handling.html
6. **Zod Validation**: https://zod.dev/
7. **JSON Schema Validation**: https://json-schema.org/
8. **Structured Logging**: https://github.com/pinojs/pino