/**
 * Unit tests for AI response parser
 */

import { describe, it, expect, vi } from 'vitest';
import { AIResponseParser } from '../utils/ai-response-parser';

describe('AIResponseParser', () => {
  const parser = new AIResponseParser();
  
  describe('parseAIResponse', () => {
    it('should return empty array for "no issues" response', () => {
      const response = 'No significant issues found. Good job!';
      const result = parser.parseAIResponse(response);
      
      expect(result).toEqual([]);
    });
    
    it('should parse a single comment correctly', () => {
      const response = `**Location**: src/index.ts:15
**Issue Type**: Bug
**Description**: Missing null check before accessing property
**Severity**: High
**Suggested Change**: Add a null check before accessing the property

---`;
      
      const result = parser.parseAIResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'src/index.ts',
        line: 15,
        body: expect.stringContaining('**Issue Type**: Bug')
      });
      expect(result[0].body).toContain('**Severity**: High');
      expect(result[0].body).toContain('**Description**: Missing null check before accessing property');
      expect(result[0].body).toContain('**Suggested Change**: Add a null check before accessing the property');
    });
    
    it('should parse multiple comments correctly', () => {
      const response = `**Location**: src/index.ts:15
**Issue Type**: Bug
**Description**: Missing null check
**Severity**: High
**Suggested Change**: Add a null check

---

**Location**: src/utils/helper.ts:42
**Issue Type**: Security
**Description**: Potential XSS vulnerability
**Severity**: Critical
**Suggested Change**: Sanitize user input

---`;
      
      const result = parser.parseAIResponse(response);
      
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('src/index.ts');
      expect(result[0].line).toBe(15);
      expect(result[1].path).toBe('src/utils/helper.ts');
      expect(result[1].line).toBe(42);
      expect(result[1].body).toContain('**Severity**: Critical');
    });
    
    it('should handle malformed location gracefully', () => {
      const response = `**Location**: src/index.ts
**Issue Type**: Bug
**Description**: Missing semicolon
**Severity**: Low
**Suggested Change**: Add semicolon

---`;
      
      const result = parser.parseAIResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
      expect(result[0].line).toBe(1); // Default to line 1
    });
    
    it('should handle multi-line descriptions and suggestions', () => {
      const response = `**Location**: src/index.ts:15
**Issue Type**: Bug
**Description**: This is a
multi-line description
with details
**Severity**: Medium
**Suggested Change**: Replace with:
\`\`\`ts
if (value !== null) {
  doSomething(value);
}
\`\`\`

---`;
      
      const result = parser.parseAIResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0].body).toContain('multi-line description');
      expect(result[0].body).toContain('```ts');
    });
  });
});
