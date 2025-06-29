# Active Context: Code Critics

## Current Work Focus
**Current Phase**: Phase 3 - Core AI Review Logic (Starting)
*(See `progress.md` for the full project roadmap.)*

**Immediate Goal**: Implement AI integration for code review.

**Completed Tasks in Phase 2**:
1. ✅ Create the basic directory structure inside `/src`
2. ✅ Implement a basic Express server as the webhook entry point
3. ✅ Set up the Octokit client for GitHub API communication
4. ✅ Implement webhook signature verification for security
5. ✅ Handle `pull_request` and `issue_comment` events
6. ✅ Test basic GitHub API connectivity

**Next Actions (Phase 3)**:
1. 🔄 Design and implement a configurable AI client for Gemini and DeepSeek (Task 3.1)
2. 🔄 Develop and refine a system prompt focused on critical bugs and security (Task 3.2)

## Recent Accomplishments (Phase 2 Completed)

### GitHub API Integration (Task 2.3)
- **Complete Octokit Service**: Implemented comprehensive GitHub API client with authentication, rate limiting, and error handling
- **PR Data Fetching**: Support for fetching PR details, diffs, and file changes with fallback strategies
- **Comment Management**: Full support for inline comments, PR comments, and review creation
- **Rate Limiting**: Built-in retry logic with exponential backoff for GitHub API rate limits
- **Repository Security**: Allowlist support for restricting analysis to specific repositories

### Webhook Security (Task 2.4)
- **HMAC-SHA256 Verification**: Secure webhook signature verification using timing-safe comparison
- **Payload Validation**: Comprehensive validation of webhook payload structure and required fields
- **Rate Limiting**: Per-repository rate limiting (10 requests/hour) with cleanup mechanisms
- **Security Headers**: Proper error handling without exposing sensitive information
- **Input Sanitization**: Validation of all incoming webhook data

### Event Handling (Task 2.5)
- **Pull Request Events**: Full support for `opened`, `synchronize`, and `reopened` events
- **Comment Events**: Manual trigger support via `@codecritics` mentions in PR comments
- **Smart Processing**: Event filtering to only process relevant events and avoid spam
- **Duplicate Prevention**: Timestamp-based deduplication to avoid multiple reviews of same changes
- **Error Recovery**: Comprehensive error handling with user-friendly error messages

### GitHub API Connectivity (Task 2.6)
- **Token Validation**: Successfully verified GitHub token authentication
- **Rate Limit Checking**: Confirmed API rate limits and remaining requests
- **Repository Access**: Verified access to target repositories
- **Testing Approach**: Implemented tsx for fast TypeScript execution during testing

## Key Implementation Features

### Strategic Decisions Implemented
Based on research question answers:
- **AI Fallback Strategy**: Prepared for fallback to secondary provider with logging (Option B)
- **Comment Deduplication**: Timestamp-based change detection to prevent spam (Option C)
- **Rate Limiting**: Per-repository rate limiting for abuse protection (Option A)
- **Error Reporting**: Different detail levels based on error type for security (Option C)
- **Large PR Handling**: File type filtering for meaningful analysis (Option B)
- **Repository Security**: Allowlist support for trusted repositories (Option B)

### Technical Patterns Implemented
- **Service Architecture**: Clean separation with GitHubService, webhook handlers, and utilities
- **Structured Logging**: Comprehensive logging with context and error tracking
- **Configuration Management**: Environment variable validation with sensible defaults
- **Type Safety**: Complete TypeScript interfaces for all data structures
- **Error Classification**: Proper HTTP status codes and user-friendly error messages

### Security Features
- **Webhook Signature Verification**: HMAC-SHA256 with timing-safe comparison
- **Repository Allowlisting**: Optional restriction to specific repositories
- **Rate Limiting**: Per-repository limits to prevent abuse
- **Input Validation**: Comprehensive payload structure validation
- **Error Handling**: Secure error messages without information leakage

## Current Considerations
- **Phase 3 Planning**: GitHub integration is complete, now focusing on AI service implementation
- **AI Client Design**: Need to design a flexible client that supports both Gemini and DeepSeek
- **System Prompt**: Need to develop an effective prompt focused on critical bugs and security
- **Testing Strategy**: Plan for testing AI interactions with mock responses
- **Performance**: Consider optimizations for handling large diffs and AI response processing

## Active Decisions & Patterns
**GitHub Integration**:
- Comprehensive Octokit client with full error handling and rate limiting
- Support for both automatic (PR events) and manual (`@codecritics` comment) triggers
- Repository allowlisting for security and per-repository rate limiting
- Smart deduplication to avoid review spam while allowing manual overrides

**Technical Patterns**:
- **Service-Oriented Architecture**: Clean separation of concerns with dedicated services
- **Structured Logging**: Context-aware logging with request tracking
- **Configuration Validation**: Environment variable validation with clear error messages
- **Type Safety**: Complete TypeScript coverage for all interfaces and data structures
- **Error Resilience**: Comprehensive error handling with appropriate HTTP status codes

**Security Implementation**:
- **Webhook Security**: HMAC-SHA256 signature verification with timing attack protection
- **Rate Limiting**: Per-repository limits with cleanup mechanisms
- **Input Validation**: Comprehensive payload validation and sanitization
- **Repository Control**: Optional allowlisting for trusted repositories only

**Development Approach**:
- **Research-Driven**: Implementation based on comprehensive research findings
- **Best Practices**: Following established patterns for webhook security and API integration
- **Incremental Development**: Phased approach with clear milestones and testing
- **Documentation**: Comprehensive logging and error messages for debugging