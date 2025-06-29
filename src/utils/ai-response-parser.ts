import { ReviewComment } from '../types';
import { Logger } from './logger';

/**
 * Utility class for parsing AI review responses into structured comments
 */
export class AIResponseParser {
  private logger = new Logger();

  /**
   * Parse AI response text into structured review comments
   * 
   * @param aiResponse - The raw text response from the AI
   * @returns Array of structured review comments
   */
  public parseAIResponse(aiResponse: string): ReviewComment[] {
    // Early return for "no issues" response
    if (aiResponse.includes("No significant issues found. Good job!")) {
      this.logger.info('AI reported no significant issues');
      return [];
    }

    const comments: ReviewComment[] = [];
    const lines = aiResponse.split('\n');
    let currentComment: Partial<ReviewComment & { 
      issueType: string; 
      description: string; 
      severity: string; 
      suggestedChange: string; 
    }> = {};
    
    let parsingComment = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Start of a new comment block
      if (trimmedLine.startsWith('**Location**:')) {
        // If we were already parsing a comment, save it if it has the minimum required fields
        if (parsingComment && currentComment.path && currentComment.line && currentComment.description) {
          comments.push(this.createCommentFromParsedData(currentComment));
        }
        
        // Start a new comment
        currentComment = {};
        parsingComment = true;
        
        // Parse location
        const location = line.substring(line.indexOf(':') + 1).trim().replace(/`/g, '');
        const locationParts = location.split(':');
        
        if (locationParts.length >= 2) {
          currentComment.path = locationParts[0].trim();
          currentComment.line = parseInt(locationParts[1].trim(), 10);
          
          // Handle NaN for line number
          if (isNaN(currentComment.line)) {
            this.logger.warn('Invalid line number in AI response', { location });
            currentComment.line = 1; // Default to line 1 if parsing fails
          }
        } else {
          // Handle malformed location
          this.logger.warn('Malformed location in AI response', { location });
          currentComment.path = location.trim();
          currentComment.line = 1; // Default to line 1
        }
      } 
      // Parse other fields
      else if (parsingComment) {
        if (trimmedLine.startsWith('**Issue Type**:')) {
          currentComment.issueType = line.substring(line.indexOf(':') + 1).trim();
        } else if (trimmedLine.startsWith('**Description**:')) {
          currentComment.description = line.substring(line.indexOf(':') + 1).trim();
        } else if (trimmedLine.startsWith('**Severity**:')) {
          currentComment.severity = line.substring(line.indexOf(':') + 1).trim();
        } else if (trimmedLine.startsWith('**Suggested Change**:')) {
          currentComment.suggestedChange = line.substring(line.indexOf(':') + 1).trim();
        } else if (trimmedLine === '---') {
          // End of a comment block
          if (currentComment.path && currentComment.description) {
            comments.push(this.createCommentFromParsedData(currentComment));
          }
          currentComment = {};
          parsingComment = false;
        } else if (currentComment.suggestedChange) {
          // Append multi-line suggested changes
          currentComment.suggestedChange += '\n' + line;
        } else if (currentComment.description && !currentComment.severity && !trimmedLine.startsWith('**')) {
          // Append multi-line descriptions
          currentComment.description += '\n' + line;
        }
      }
    }

    // Handle case where AI response might not end with '---'
    if (parsingComment && currentComment.path && currentComment.description) {
      comments.push(this.createCommentFromParsedData(currentComment));
    }

    // Log parsing results
    this.logger.info(`Parsed ${comments.length} comments from AI response`);
    
    return comments;
  }
  
  /**
   * Create a formatted review comment from parsed data
   * 
   * @param data - Partially parsed comment data
   * @returns Fully formatted review comment
   */
  private createCommentFromParsedData(data: Partial<ReviewComment & { 
    issueType: string; 
    description: string; 
    severity: string; 
    suggestedChange: string; 
  }>): ReviewComment {
    // Validate and provide defaults for required fields
    const path = data.path || 'unknown';
    const line = data.line || 1;
    const issueType = data.issueType || 'Code Issue';
    const description = data.description || 'No description provided';
    const severity = data.severity || 'Medium';
    const suggestedChange = data.suggestedChange || 'No specific change suggested';
    
    // Format the comment body with consistent styling
    const body = `**Issue Type**: ${issueType}
**Description**: ${description}
**Severity**: ${severity}
**Suggested Change**: ${suggestedChange}

<!-- code-critics-comment -->`;

    return { path, line, body };
  }
}
