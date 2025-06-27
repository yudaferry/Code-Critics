# AI APIs Integration Research

## Overview
Research on integrating Gemini and DeepSeek APIs for code review analysis, including prompt engineering, response parsing, and error handling strategies.

## Gemini API Integration

### Setup and Authentication
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Get the model
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.1, // Low temperature for consistent code analysis
    topK: 1,
    topP: 0.8,
    maxOutputTokens: 4096,
  }
});
```

### Model Selection Strategy
- **gemini-1.5-flash**: Fast, cost-effective for code review (recommended)
- **gemini-1.5-pro**: More capable but slower and more expensive
- **gemini-1.0-pro**: Legacy model, lower context window

### Code Review Prompt Engineering
```typescript
const SYSTEM_PROMPT = `You are an expert code reviewer focusing ONLY on critical bugs and security vulnerabilities.

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

If no critical issues found, return: []`;

async function analyzeCode(diff: string): Promise<CodeReviewResult[]> {
  const prompt = `${SYSTEM_PROMPT}

CODE DIFF TO ANALYZE:
\`\`\`diff
${diff}
\`\`\`

Analyze the above code diff and return findings in JSON format:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const findings = JSON.parse(text);
    return Array.isArray(findings) ? findings : [];
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Code analysis failed: ${error.message}`);
  }
}
```

### Token Management
```typescript
async function estimateTokens(text: string): Promise<number> {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // Code typically has higher token density
  return Math.ceil(text.length / 3);
}

async function chunkDiffIfNeeded(diff: string, maxTokens: number = 30000): Promise<string[]> {
  const estimatedTokens = await estimateTokens(diff);
  
  if (estimatedTokens <= maxTokens) {
    return [diff];
  }
  
  // Split by files if diff is too large
  const files = diff.split(/^diff --git/m);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const file of files) {
    const fileTokens = await estimateTokens(file);
    
    if (await estimateTokens(currentChunk + file) > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = file;
      } else {
        // Single file too large - split by hunks
        chunks.push(file);
      }
    } else {
      currentChunk += file;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}
```

## DeepSeek API Integration

### Setup and Authentication
```typescript
import axios, { AxiosInstance } from 'axios';

class DeepSeekClient {
  private client: AxiosInstance;
  
  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.deepseek.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds timeout
    });
  }
  
  async analyzeCode(diff: string): Promise<CodeReviewResult[]> {
    const response = await this.client.post('/chat/completions', {
      model: 'deepseek-coder',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `CODE DIFF TO ANALYZE:\n\`\`\`diff\n${diff}\n\`\`\`\n\nAnalyze and return findings in JSON format:`
        }
      ],
      temperature: 0.1,
      max_tokens: 4096,
      stream: false
    });
    
    const content = response.data.choices[0].message.content;
    
    try {
      const findings = JSON.parse(content);
      return Array.isArray(findings) ? findings : [];
    } catch (error) {
      console.error('Failed to parse DeepSeek response:', content);
      throw new Error('Invalid JSON response from DeepSeek');
    }
  }
}
```

### Model Selection
- **deepseek-coder**: Specialized for code analysis (recommended)
- **deepseek-chat**: General purpose model
- **deepseek-instruct**: Instruction-following model

## Unified AI Client Interface

### Abstract AI Client
```typescript
interface AIClient {
  analyzeCode(diff: string): Promise<CodeReviewResult[]>;
  isAvailable(): Promise<boolean>;
  getModelInfo(): ModelInfo;
}

interface CodeReviewResult {
  type: 'bug' | 'security';
  severity: 'critical' | 'high';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion: string;
}

interface ModelInfo {
  name: string;
  provider: 'gemini' | 'deepseek';
  maxTokens: number;
  costPer1kTokens: number;
}
```

### Gemini Client Implementation
```typescript
class GeminiClient implements AIClient {
  private model: any;
  
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    });
  }
  
  async analyzeCode(diff: string): Promise<CodeReviewResult[]> {
    // Implementation from above
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      await this.model.generateContent('test');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  getModelInfo(): ModelInfo {
    return {
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      maxTokens: 1048576, // 1M tokens context
      costPer1kTokens: 0.00015 // $0.15 per 1M tokens
    };
  }
}
```

### AI Service Manager
```typescript
class AIServiceManager {
  private primaryClient: AIClient;
  private secondaryClient?: AIClient;
  
  constructor(
    primaryClient: AIClient,
    secondaryClient?: AIClient
  ) {
    this.primaryClient = primaryClient;
    this.secondaryClient = secondaryClient;
  }
  
  async analyzeCode(diff: string): Promise<{
    results: CodeReviewResult[];
    usedProvider: string;
  }> {
    try {
      const results = await this.primaryClient.analyzeCode(diff);
      return {
        results,
        usedProvider: this.primaryClient.getModelInfo().provider
      };
    } catch (error) {
      console.error('Primary AI service failed:', error);
      
      if (this.secondaryClient) {
        try {
          const results = await this.secondaryClient.analyzeCode(diff);
          return {
            results,
            usedProvider: this.secondaryClient.getModelInfo().provider
          };
        } catch (secondaryError) {
          console.error('Secondary AI service also failed:', secondaryError);
        }
      }
      
      throw new Error('All AI services unavailable');
    }
  }
}
```

## Response Parsing and Validation

### Response Schema Validation
```typescript
import Joi from 'joi';

const CodeReviewResultSchema = Joi.object({
  type: Joi.string().valid('bug', 'security').required(),
  severity: Joi.string().valid('critical', 'high').required(),
  file: Joi.string().required(),
  line: Joi.number().integer().min(1).required(),
  title: Joi.string().max(100).required(),
  description: Joi.string().max(500).required(),
  suggestion: Joi.string().max(300).required()
});

const CodeReviewResponseSchema = Joi.array().items(CodeReviewResultSchema);

function validateResponse(response: any): CodeReviewResult[] {
  const { error, value } = CodeReviewResponseSchema.validate(response);
  
  if (error) {
    console.error('Invalid AI response format:', error.details);
    return [];
  }
  
  return value;
}
```

### Robust JSON Parsing
```typescript
function parseAIResponse(text: string): CodeReviewResult[] {
  // Remove markdown code blocks if present
  const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
  
  try {
    const parsed = JSON.parse(cleanText);
    return validateResponse(parsed);
  } catch (error) {
    // Try to extract JSON from text
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateResponse(parsed);
      } catch (innerError) {
        console.error('Failed to parse extracted JSON:', innerError);
      }
    }
    
    console.error('Failed to parse AI response as JSON:', error);
    return [];
  }
}
```

## Error Handling and Retry Logic

### Comprehensive Error Handling
```typescript
class AIServiceError extends Error {
  constructor(
    message: string,
    public provider: string,
    public errorType: 'rate_limit' | 'auth' | 'quota' | 'network' | 'parse' | 'unknown',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

async function handleAIRequest<T>(
  request: () => Promise<T>,
  provider: string
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 401:
          throw new AIServiceError(
            'Invalid API key',
            provider,
            'auth',
            false
          );
        case 429:
          throw new AIServiceError(
            'Rate limit exceeded',
            provider,
            'rate_limit',
            true
          );
        case 402:
        case 403:
          throw new AIServiceError(
            'Quota exceeded or billing issue',
            provider,
            'quota',
            false
          );
        default:
          throw new AIServiceError(
            `API error: ${data?.error?.message || 'Unknown error'}`,
            provider,
            'unknown',
            status >= 500
          );
      }
    } else if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      throw new AIServiceError(
        'Network error',
        provider,
        'network',
        true
      );
    } else {
      throw new AIServiceError(
        error.message,
        provider,
        'unknown',
        false
      );
    }
  }
}
```

### Retry with Exponential Backoff
```typescript
async function retryAIRequest<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AIServiceError && !error.retryable) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`AI request attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Performance Optimization

### Caching Strategy
```typescript
import NodeCache from 'node-cache';

class AIResponseCache {
  private cache = new NodeCache({ 
    stdTTL: 3600, // 1 hour
    maxKeys: 1000 
  });
  
  private generateKey(diff: string, provider: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(`${provider}:${diff}`)
      .digest('hex');
  }
  
  async get(diff: string, provider: string): Promise<CodeReviewResult[] | null> {
    const key = this.generateKey(diff, provider);
    return this.cache.get(key) || null;
  }
  
  async set(diff: string, provider: string, results: CodeReviewResult[]): Promise<void> {
    const key = this.generateKey(diff, provider);
    this.cache.set(key, results);
  }
}
```

### Concurrent Processing
```typescript
async function analyzeMultipleChunks(
  chunks: string[],
  aiClient: AIClient
): Promise<CodeReviewResult[]> {
  const results = await Promise.all(
    chunks.map(chunk => aiClient.analyzeCode(chunk))
  );
  
  // Flatten and deduplicate results
  const allResults = results.flat();
  const uniqueResults = allResults.filter((result, index, array) => 
    array.findIndex(r => 
      r.file === result.file && 
      r.line === result.line && 
      r.title === result.title
    ) === index
  );
  
  return uniqueResults;
}
```

## References

1. **Google Gemini API Documentation**: https://ai.google.dev/docs
2. **Gemini API Node.js SDK**: https://github.com/google/generative-ai-js
3. **DeepSeek API Documentation**: https://platform.deepseek.com/api-docs/
4. **OpenAI API Reference (for DeepSeek compatibility)**: https://platform.openai.com/docs/api-reference
5. **Prompt Engineering Guide**: https://www.promptingguide.ai/
6. **Code Review Best Practices**: https://google.github.io/eng-practices/review/
7. **AI Safety for Code Analysis**: https://arxiv.org/abs/2108.07732
8. **Token Estimation Techniques**: https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them