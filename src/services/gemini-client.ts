import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIClient } from './ai-client';
import { AIChatMessage } from '../types/ai';
import { Logger } from '../utils/logger';

/**
 * Client implementation for Google's Gemini AI API
 * Handles communication with Gemini Pro model
 */
export class GeminiClient extends AIClient {
  private model: GoogleGenerativeAI;
  private logger: Logger;

  /**
   * Creates a new Gemini client instance
   * 
   * @param apiKey - Gemini API key for authentication
   * @throws Error if API key is not provided
   */
  constructor(apiKey: string, logger?: Logger) {
    super(apiKey);
    this.model = new GoogleGenerativeAI(this.apiKey);
    this.logger = logger || new Logger();
  }

  /**
   * Generates a completion from Gemini's API based on provided messages
   * 
   * @param messages - Array of chat messages to send to the AI
   * @returns Promise resolving to the AI's response text
   * @throws Error if the API call fails or returns invalid data
   */
  async generateCompletion(messages: AIChatMessage[]): Promise<string> {
    try {
      const model = this.model.getGenerativeModel({ model: 'gemini-pro' });
      const chat = model.startChat({
        history: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: 2000,
        },
      });

      const result = await chat.sendMessage(messages[messages.length - 1].content);
      const response = await result.response;
      return response.text();
    } catch (error) {
      // Sanitize error message to prevent sensitive data leakage
      const sanitizedError = this.sanitizeErrorMessage((error as Error).message);
      this.logger.error('Failed to generate completion with Gemini', error as Error);
      throw new Error(`Failed to generate completion with Gemini: ${sanitizedError}`);
    }
  }

  /**
   * Sanitize error message to prevent sensitive data leakage
   * 
   * @param errorMessage - Raw error message
   * @returns Sanitized error message
   */
  private sanitizeErrorMessage(errorMessage: string): string {
    // Remove potential API keys, tokens, and sensitive patterns
    return errorMessage
      .replace(/[a-zA-Z0-9_-]{32,}/g, '[REDACTED_TOKEN]')
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(/key['":\s]+[a-zA-Z0-9_-]{20,}/gi, 'key: [REDACTED]')
      .substring(0, 200); // Limit length to prevent log flooding
  }
} 