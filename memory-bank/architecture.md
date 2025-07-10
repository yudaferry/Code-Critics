# Code Critics Architecture

## Overview
Code Critics is a modular, AI-powered GitHub code review application built with TypeScript and Node.js. The architecture follows clean code principles with clear separation of concerns, dependency injection, and functional programming patterns.

## Directory Structure

```
src/
├── core/                    # Core application modules
│   ├── index.ts            # Main exports and public API
│   └── container.ts        # Dependency injection container
├── domains/                # Domain-specific modules
│   ├── ai/                 # AI-related functionality
│   │   └── index.ts        # AI domain exports
│   ├── github/             # GitHub-related functionality
│   │   └── index.ts        # GitHub domain exports
│   └── review/             # Review-related functionality
│       └── index.ts        # Review domain exports
├── services/               # Business logic services
│   ├── ai-client.ts        # Abstract AI client interface
│   ├── gemini-client.ts    # Gemini AI implementation
│   ├── deepseek-client.ts  # DeepSeek AI implementation
│   ├── github.ts           # GitHub API service
│   ├── code-reviewer.ts    # Main review orchestration
│   └── webhook-handlers.ts # Webhook event handlers
├── utils/                  # Utility modules
│   ├── logger.ts           # Structured logging
│   ├── config.ts           # Configuration management
│   ├── constants.ts        # Application constants
│   ├── functional.ts       # Functional programming utilities
│   ├── ai-prompts.ts       # AI prompt templates
│   ├── ai-response-parser.ts # AI response parsing
│   ├── diff-processor.ts   # Diff processing utilities
│   └── webhook-security.ts # Security utilities
├── types/                  # TypeScript type definitions
│   ├── index.ts            # Core types
│   └── ai.ts               # AI-specific types
├── tests/                  # Test files
│   ├── setup.ts            # Test configuration
│   ├── github.test.ts      # GitHub service tests
│   ├── ai-response-parser.test.ts # Parser tests
│   └── diff-processor.test.ts # Diff processor tests
└── index.ts                # Main Express server
```

## Architectural Patterns

### 1. Dependency Injection
- **Container Pattern**: Central `Container` class manages all service dependencies
- **Constructor Injection**: Services receive dependencies through constructors
- **Singleton Pattern**: Services are instantiated once and reused
- **Interface Segregation**: Clear interfaces for each service type

### 2. Domain-Driven Design
- **Domain Modules**: Functionality grouped by business domain (AI, GitHub, Review)
- **Bounded Contexts**: Clear boundaries between different areas of concern
- **Service Layer**: Business logic encapsulated in dedicated service classes

### 3. Functional Programming
- **Pure Functions**: Utility functions with no side effects
- **Immutability**: Data structures designed to be immutable
- **Result Types**: Functional error handling with Result<T, E> types
- **Option Types**: Safe nullable value handling with Option<T> types
- **Function Composition**: Utilities for composing and chaining operations

### 4. Clean Architecture
- **Separation of Concerns**: Each module has a single responsibility
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Interface Abstraction**: Dependencies accessed through interfaces
- **Testability**: All components designed for easy unit testing

## Service Architecture

### Core Services
1. **GitHubService**: GitHub API interactions, webhook processing
2. **CodeReviewService**: Main review orchestration and business logic
3. **AIClient**: Abstract interface for AI providers
4. **Logger**: Structured logging with context and rotation

### AI Services
1. **GeminiClient**: Google Gemini AI implementation
2. **DeepSeekClient**: DeepSeek AI implementation
3. **AIResponseParser**: Parsing AI responses into structured data

### Utility Services
1. **DiffProcessor**: Processing large diffs efficiently
2. **WebhookSecurity**: Signature verification and payload validation
3. **Config**: Environment configuration management

## Data Flow

```
GitHub Webhook → Express Server → Webhook Security → Event Handler
                                                           ↓
Container → CodeReviewService → GitHubService (fetch PR data)
                ↓                      ↓
        AIClient (review) ← DiffProcessor (filter/chunk)
                ↓
        AIResponseParser → ReviewComments
                ↓
        GitHubService (post comments) → Status Update
```

## Security Features

1. **Webhook Signature Verification**: HMAC-SHA256 validation
2. **Input Sanitization**: Payload and header sanitization
3. **Rate Limiting**: Per-repository request limits
4. **Error Sanitization**: Sensitive data removal from errors
5. **URL Validation**: SSRF protection for diff URLs

## Error Handling

1. **Functional Error Handling**: Result types for safe error propagation
2. **Graceful Degradation**: Fallback mechanisms for AI providers
3. **Structured Logging**: Comprehensive error context and tracking
4. **User-Friendly Messages**: Sanitized error messages for end users

## Testing Strategy

1. **Unit Tests**: Individual service and utility testing
2. **Integration Tests**: Service interaction testing
3. **Mock Services**: Dependency injection enables easy mocking
4. **Test Utilities**: Shared test setup and helper functions

## Performance Optimizations

1. **Memory Management**: Streaming processing for large diffs
2. **Lazy Loading**: Services instantiated only when needed
3. **Caching**: Memoization for expensive operations
4. **Asynchronous Processing**: Non-blocking webhook responses

## Deployment Architecture

- **Serverless**: Vercel Functions for automatic scaling
- **Stateless**: No persistent state between requests
- **Environment Configuration**: Externalized configuration
- **Health Monitoring**: Comprehensive health check endpoints

This architecture provides a solid foundation for maintainable, testable, and scalable code review automation. 