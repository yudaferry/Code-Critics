import { AIClient } from './ai-client';
import { AIChatMessage, DeepSeekChatCompletionResponse } from '../types/ai';
import { Logger } from '../utils/logger';
import config from '../utils/config';

/**
 * Client implementation for DeepSeek's AI API
 * Handles communication with DeepSeek's code-focused models
 */
export class DeepSeekClient extends AIClient {
  private baseUrl: string = 'https://api.deepseek.com/chat/completions';
  private logger: Logger;

  /**
   * Creates a new DeepSeek client instance
   * 
   * @param apiKey - DeepSeek API key for authentication
   * @throws Error if API key is not provided
   */
  constructor(apiKey: string) {
    super(apiKey);
    this.logger = new Logger();
  }

  /**
   * Sanitize error response to prevent sensitive data leakage
   * 
   * @param errorBody - Raw error response body
   * @returns Sanitized error response
   */
  private sanitizeErrorResponse(errorBody: string): string {
    if (config.NODE_ENV === 'production') {
      return '[Error details redacted in production]';
    }
    
    // Remove potential API keys, tokens, and sensitive patterns
    return errorBody
      .replace(/[a-zA-Z0-9_-]{32,}/g, '[REDACTED_TOKEN]')
      .replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(/token['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'token: [REDACTED]')
      .replace(/key['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'key: [REDACTED]')
      .replace(/secret['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'secret: [REDACTED]')
      .replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]')
      .substring(0, 500); // Limit length to prevent log flooding
  }

  /**
   * Generates a completion from DeepSeek's API based on provided messages
   * 
   * @param messages - Array of chat messages to send to the AI
   * @returns Promise resolving to the AI's response text
   * @throws Error if the API call fails or returns invalid data
   */
  async generateCompletion(messages: AIChatMessage[]): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-coder',
          messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        // Always sanitize error responses to prevent sensitive data leakage
        const sanitizedErrorBody = this.sanitizeErrorResponse(errorBody);
        this.logger.error(
          `DeepSeek API error: ${response.status} - ${response.statusText}`,
          undefined, // No Error object here, as we are creating a new one next
          { status: response.status, body: sanitizedErrorBody }
        );
        throw new Error(`DeepSeek API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json() as DeepSeekChatCompletionResponse;
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        this.logger.error(
          'Invalid response from DeepSeek API: Missing choices or message',
          undefined, // No Error object here
          { responseData: data }
        );
        throw new Error('Invalid response from DeepSeek API');
      }
    } catch (error) {
      this.logger.error('Error generating completion with DeepSeek', error as Error);
      throw new Error('Failed to generate completion with DeepSeek.');
    }
  }
}
