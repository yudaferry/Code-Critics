export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIClient {
  generateCompletion(messages: AIChatMessage[]): Promise<string>;
}

/**
 * Response structure from DeepSeek API
 */
export interface DeepSeekChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
} 