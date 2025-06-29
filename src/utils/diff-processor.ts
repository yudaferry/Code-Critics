/**
 * Utility for processing large diffs efficiently
 * Implements streaming processing to reduce memory usage
 */

import { Logger } from './logger';

export class DiffProcessor {
  private logger = new Logger();
  
  /**
   * Process a large diff in chunks to reduce memory usage
   * 
   * @param diff - The full diff content
   * @param chunkSize - Maximum size of each chunk in bytes
   * @param processor - Function to process each chunk
   * @returns Promise resolving to combined results from all chunks
   */
  async processLargeDiffInChunks<T>(
    diff: string, 
    chunkSize: number = 50000,
    processor: (chunk: string) => Promise<T>
  ): Promise<T[]> {
    this.logger.info('Processing large diff in chunks', { 
      diffSize: diff.length, 
      chunkSize 
    });
    
    // Split diff into chunks based on file boundaries
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by diff headers to maintain file integrity
    const diffParts = diff.split(/(?=diff --git )/);
    
    for (const part of diffParts) {
      // If adding this part would exceed chunk size, start a new chunk
      if (currentChunk.length + part.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = part;
        
        // Force garbage collection hint for large strings
        if (typeof global !== 'undefined' && global.gc && currentChunk.length > 100000) {
          try {
            setImmediate(() => global.gc?.());
          } catch (error) {
            // Ignore GC errors - it's just a hint
            this.logger.debug('GC hint failed', error as Error);
          }
        }
      } else {
        currentChunk += part;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    this.logger.info(`Split diff into ${chunks.length} chunks`);
    
    // Process each chunk and collect results
    const results: T[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      this.logger.debug(`Processing chunk ${i+1}/${chunks.length}`, { 
        chunkSize: chunks[i].length 
      });
      
      const result = await processor(chunks[i]);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Filter a diff to only include files with specific extensions
   * 
   * @param diff - The full diff content
   * @param allowedExtensions - Array of allowed file extensions
   * @returns Filtered diff content
   */
  filterDiffByExtensions(diff: string, allowedExtensions: string[]): string {
    // Split by diff headers
    const diffParts = diff.split(/(?=diff --git )/);
    
    // Filter parts that match allowed extensions
    const filteredParts = diffParts.filter(part => {
      // Empty parts should be skipped
      if (!part.trim()) return false;
      
      // Extract filename from diff header
      const filenameMatch = part.match(/diff --git a\/(.*?) b\/(.*?)$/m);
      if (!filenameMatch) return false;
      
      const filename = filenameMatch[1];
      return allowedExtensions.some(ext => 
        filename.toLowerCase().endsWith(ext.toLowerCase())
      );
    });
    
    return filteredParts.join('');
  }
}
