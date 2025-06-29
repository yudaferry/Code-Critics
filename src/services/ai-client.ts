import { AIChatMessage } from '../types/ai';

/**
 * Abstract base class for AI service clients
 * Provides a common interface for different AI providers
 */
export abstract class AIClient {
  protected apiKey: string;

  /**
   * Creates a new AI client instance
   * 
   * @param apiKey - API key for authentication with the AI service
   * @throws Error if API key is not provided
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('AI_API_KEY is not set.');
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate a completion from the AI service based on provided messages
   * 
   * @param messages - Array of chat messages to send to the AI
   * @returns Promise resolving to the AI's response text
   * @throws Error if the API call fails
   */
  abstract generateCompletion(messages: AIChatMessage[]): Promise<string>;
} 