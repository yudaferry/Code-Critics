// Environment configuration with validation

import { SUPPORTED_FILE_EXTENSIONS } from './constants';

interface Config {
  GITHUB_TOKEN: string;
  WEBHOOK_SECRET: string;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  AI_PROVIDER: 'gemini' | 'deepseek';
  MAX_DIFF_SIZE: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  NODE_ENV: 'development' | 'production' | 'test';
  ALLOWED_REPOSITORIES?: string;
  ALLOWED_FILE_EXTENSIONS: string[];
}

function validateConfig(): Config {
  const requiredEnvVars = ['GITHUB_TOKEN', 'WEBHOOK_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const aiProvider = (process.env.AI_PROVIDER || 'gemini') as 'gemini' | 'deepseek';
  
  // Validate AI provider configuration
  if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when AI_PROVIDER is gemini');
  }
  
  if (aiProvider === 'deepseek' && !process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is required when AI_PROVIDER is deepseek');
  }

  return {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET!,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    AI_PROVIDER: aiProvider,
    MAX_DIFF_SIZE: parseInt(process.env.MAX_DIFF_SIZE || '100000'),
    LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as Config['LOG_LEVEL'],
    NODE_ENV: (process.env.NODE_ENV || 'development') as Config['NODE_ENV'],
    ALLOWED_REPOSITORIES: process.env.ALLOWED_REPOSITORIES,
    ALLOWED_FILE_EXTENSIONS: process.env.ALLOWED_FILE_EXTENSIONS?.split(',') || [...SUPPORTED_FILE_EXTENSIONS]
  };
}

export const config = validateConfig();
export default config;