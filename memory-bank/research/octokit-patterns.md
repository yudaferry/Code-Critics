# Octokit Integration Patterns Research

## Overview
Research on GitHub API client patterns, authentication, PR diff fetching, and comment posting strategies using @octokit/rest.

## Client Initialization and Authentication

### Basic Setup
```typescript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'code-critics/1.0.0',
  baseUrl: 'https://api.github.com',
  log: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
  }
});
```

### Authentication Patterns
**Personal Access Token (PAT)**:
- Scope required: `repo` (for private repos) or `public_repo` (for public repos)
- Additional scopes: `write:discussion` (for PR comments)

**Token Validation**:
```typescript
async function validateToken(octokit: Octokit): Promise<boolean> {
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log(`Authenticated as: ${data.login}`);
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
}
```

## Pull Request Data Fetching

### Get PR Details
```typescript
async function getPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
) {
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });
  
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    head: {
      sha: pr.head.sha,
      ref: pr.head.ref
    },
    base: {
      sha: pr.base.sha,
      ref: pr.base.ref
    },
    diff_url: pr.diff_url,
    patch_url: pr.patch_url
  };
}
```

### Fetch PR Diff
**Method 1: Using diff_url**
```typescript
import axios from 'axios';

async function getPRDiff(diffUrl: string, token: string): Promise<string> {
  const response = await axios.get(diffUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3.diff'
    }
  });
  
  return response.data;
}
```

**Method 2: Using Octokit compare API**
```typescript
async function getPRDiffViaCompare(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseSha: string,
  headSha: string
): Promise<string> {
  const { data } = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base: baseSha,
    head: headSha,
    mediaType: {
      format: 'diff'
    }
  });
  
  return data as unknown as string;
}
```

### Get Changed Files
```typescript
async function getChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
) {
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber
  });
  
  return files.map(file => ({
    filename: file.filename,
    status: file.status, // 'added', 'removed', 'modified', 'renamed'
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch, // The actual diff for this file
    blob_url: file.blob_url
  }));
}
```

## Comment Posting Strategies

### Inline Comments (Line-specific)
```typescript
async function postInlineComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  comment: {
    path: string;
    line: number;
    body: string;
    side?: 'LEFT' | 'RIGHT'; // Default: 'RIGHT'
  }
) {
  await octokit.rest.pulls.createReviewComment({
    owner,
    repo,
    pull_number: pullNumber,
    body: comment.body,
    path: comment.path,
    line: comment.line,
    side: comment.side || 'RIGHT'
  });
}
```

### PR-level Comments
```typescript
async function postPRComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
) {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber, // PR numbers are issue numbers
    body
  });
}
```

### Review Comments (Batch)
```typescript
async function postReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  review: {
    body: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    comments: Array<{
      path: string;
      line: number;
      body: string;
    }>;
  }
) {
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    body: review.body,
    event: review.event,
    comments: review.comments
  });
}
```

## Rate Limiting and Error Handling

### Rate Limit Monitoring
```typescript
async function checkRateLimit(octokit: Octokit) {
  const { data } = await octokit.rest.rateLimit.get();
  
  console.log('Rate limit status:', {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
    used: data.rate.used
  });
  
  return data.rate;
}
```

### Retry Logic with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Check if it's a rate limit error
      if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
        const waitTime = resetTime - Date.now() + 1000; // Add 1 second buffer
        
        console.log(`Rate limited. Waiting ${waitTime}ms until reset.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Exponential backoff for other errors
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Error Classification
```typescript
function classifyGitHubError(error: any): 'rate_limit' | 'auth' | 'not_found' | 'server' | 'unknown' {
  if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
    return 'rate_limit';
  }
  
  switch (error.status) {
    case 401:
    case 403:
      return 'auth';
    case 404:
      return 'not_found';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'server';
    default:
      return 'unknown';
  }
}
```

## Advanced Patterns

### Pagination Handling
```typescript
async function getAllPRComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
) {
  const comments = [];
  
  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.listReviewComments,
    {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    }
  )) {
    comments.push(...response.data);
  }
  
  return comments;
}
```

### Webhook Integration Helper
```typescript
function extractRepoInfo(payload: any): { owner: string; repo: string; pullNumber: number } {
  const repository = payload.repository;
  const pullRequest = payload.pull_request || payload.issue;
  
  return {
    owner: repository.owner.login,
    repo: repository.name,
    pullNumber: pullRequest.number
  };
}
```

### Comment Deduplication
```typescript
async function findExistingBotComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  botUsername: string = 'code-critics[bot]'
) {
  const comments = await getAllPRComments(octokit, owner, repo, pullNumber);
  
  return comments.filter(comment => 
    comment.user.login === botUsername ||
    comment.body.includes('<!-- code-critics-comment -->')
  );
}
```

## Performance Optimization

### Concurrent API Calls
```typescript
async function processMultipleFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  comments: Array<{ path: string; line: number; body: string }>
) {
  // Batch comments by file to reduce API calls
  const commentsByFile = comments.reduce((acc, comment) => {
    if (!acc[comment.path]) acc[comment.path] = [];
    acc[comment.path].push(comment);
    return acc;
  }, {} as Record<string, typeof comments>);
  
  // Process files concurrently with rate limiting
  const semaphore = new Semaphore(5); // Max 5 concurrent requests
  
  await Promise.all(
    Object.entries(commentsByFile).map(async ([path, fileComments]) => {
      await semaphore.acquire();
      try {
        await postFileComments(octokit, owner, repo, pullNumber, fileComments);
      } finally {
        semaphore.release();
      }
    })
  );
}
```

## References

1. **@octokit/rest Documentation**: https://octokit.github.io/rest.js/
2. **GitHub REST API Reference**: https://docs.github.com/en/rest
3. **GitHub API Rate Limiting**: https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting
4. **GitHub Pull Request API**: https://docs.github.com/en/rest/pulls
5. **GitHub Issues API (for PR comments)**: https://docs.github.com/en/rest/issues/comments
6. **Octokit Authentication Guide**: https://github.com/octokit/authentication-strategies.js
7. **GitHub Personal Access Tokens**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
8. **Octokit Pagination**: https://github.com/octokit/plugin-paginate-rest.js