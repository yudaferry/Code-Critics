/**
 * AI Domain Module
 * 
 * This module encapsulates all AI-related functionality including
 * clients, response parsing, and prompt management.
 */

// AI Client interfaces and implementations
export { AIClient } from '../../services/ai-client';
export { GeminiClient } from '../../services/gemini-client';
export { DeepSeekClient } from '../../services/deepseek-client';

// AI utilities
export { AIResponseParser } from '../../utils/ai-response-parser';
export { systemPrompt } from '../../utils/ai-prompts';

// AI types
export * from '../../types/ai'; 