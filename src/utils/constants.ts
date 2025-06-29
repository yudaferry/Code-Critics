/**
 * Application constants
 */

export const SUPPORTED_FILE_EXTENSIONS = [
  '.ts', '.js', '.jsx', '.tsx', 
  '.py', '.java', '.cpp', '.c', 
  '.go', '.rs', '.php', '.rb', 
  '.cs', '.swift', '.kt', '.scala', 
  '.sh', '.sql', '.json', '.yaml', 
  '.yml', '.md'
] as const;

export const DIFF_PROCESSING = {
  LARGE_DIFF_MULTIPLIER: 1.5,
  MAX_CACHE_SIZE: 10000,
  GC_THRESHOLD: 100000
} as const;

export const RATE_LIMITING = {
  DEFAULT_MAX_REQUESTS: 10,
  DEFAULT_WINDOW_MS: 60 * 60 * 1000 // 1 hour
} as const;