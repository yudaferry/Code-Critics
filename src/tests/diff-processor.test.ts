/**
 * Unit tests for DiffProcessor
 */

import { describe, it, expect, vi } from 'vitest';
import { DiffProcessor } from '../utils/diff-processor';

describe('DiffProcessor', () => {
  const processor = new DiffProcessor();
  
  describe('filterDiffByExtensions', () => {
    it('should filter diff to only include files with allowed extensions', () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
index 1234567..abcdef0 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,7 @@
 // TypeScript file
+console.log('hello');
 
diff --git a/README.md b/README.md
index 1234567..abcdef0 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # README
+Updated documentation
 
diff --git a/src/styles.css b/src/styles.css
index 1234567..abcdef0 100644
--- a/src/styles.css
+++ b/src/styles.css
@@ -1,3 +1,4 @@
 body {
   margin: 0;
+  padding: 0;
 }`;
      
      const result = processor.filterDiffByExtensions(diff, ['.ts', '.js']);
      
      expect(result).toContain('src/index.ts');
      expect(result).not.toContain('README.md');
      expect(result).not.toContain('styles.css');
    });
    
    it('should return empty string if no files match allowed extensions', () => {
      const diff = `diff --git a/README.md b/README.md
index 1234567..abcdef0 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
 # README
+Updated documentation`;
      
      const result = processor.filterDiffByExtensions(diff, ['.ts', '.js']);
      
      expect(result).toBe('');
    });
  });
  
  describe('processLargeDiffInChunks', () => {
    it('should process diff in chunks', async () => {
      const diff = `diff --git a/file1.ts b/file1.ts
index 1234567..abcdef0 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,5 +1,7 @@
 // File 1
+console.log('hello');

diff --git a/file2.ts b/file2.ts
index 1234567..abcdef0 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1,3 +1,4 @@
 // File 2
+console.log('world');`;
      
      const mockProcessor = vi.fn().mockImplementation((chunk) => {
        return Promise.resolve(`Processed: ${chunk.length} chars`);
      });
      
      const results = await processor.processLargeDiffInChunks(diff, 100, mockProcessor);
      
      expect(results.length).toBeGreaterThan(1); // Should be split into multiple chunks
      expect(mockProcessor).toHaveBeenCalled();
      expect(results[0]).toContain('Processed:');
    });
    
    it('should handle empty diff', async () => {
      const mockProcessor = vi.fn().mockResolvedValue('processed');
      const results = await processor.processLargeDiffInChunks('', 100, mockProcessor);
      
      expect(results).toHaveLength(0);
      expect(mockProcessor).not.toHaveBeenCalled();
    });
  });
});
