# System Patterns: Code Critics

## 1. High-Level Architecture
The system follows a webhook-driven, event-based architecture. It is a stateless service that reacts to events from GitHub, processes them, and sends results back to the GitHub API.

```mermaid
graph TD
    A[GitHub Pull Request] -- Webhook Event --> B(Webhook Server);
    B -- Code Diff --> C{AI Code Analyzer};
    C -- API Call --> D[External AI API <br/>(Gemini/DeepSeek)];
    D -- AI Feedback --> C;
    C -- Formatted Comments --> E(Review Engine);
    E -- Post Comments --> F[GitHub API];
    G[GitHub PR Comment @codecritics] -- Webhook Event --> B;
```

## 2. Component Breakdown

### Webhook Server
- **Pattern**: Serverless Function (Vercel)
- **Responsibility**: To receive and validate incoming webhook payloads from GitHub. It listens for `pull_request` events (`opened`, `synchronize`) and `issue_comment` events (`created`).
- **Technology**: Node.js with Express/Fastify, deployed as Vercel Function.

### AI Code Analyzer
- **Pattern**: Service/Orchestrator
- **Responsibility**: This is the core logic unit. It extracts the entire code diff from the webhook payload, prepares a prompt, sends the data to the configured AI API, and parses the JSON response.
- **Key Functions**: Prompt engineering, API communication, response parsing.

### Review Engine
- **Pattern**: Service
- **Responsibility**: Takes the structured feedback from the AI Analyzer and formats it into valid GitHub review comments. It then uses the GitHub API client to post these comments to the correct lines in the pull request.
- **Technology**: `@octokit/rest`.

### Configuration Manager
- **Pattern**: Singleton / Module
- **Responsibility**: To load and provide access to configuration settings, such as GitHub tokens, AI API keys, and review rules. It will load settings from environment variables and per-repository configuration files.

### Diff Processor
- **Pattern**: Utility
- **Responsibility**: Efficiently process large diffs by implementing streaming processing and chunking.
- **Key Functions**: Filtering diffs by file extensions, processing diffs in chunks to reduce memory usage.

### AI Response Parser
- **Pattern**: Utility
- **Responsibility**: Parse AI responses into structured review comments.
- **Key Functions**: Extract location, issue type, description, severity, and suggested changes from AI responses.

## 3. Data Flow
1. A pull request is created/updated OR a user comments `@codecritics` on a PR.
2. GitHub sends a `pull_request` or `issue_comment` event to the registered webhook URL.
3. The **Webhook Server** receives the event, verifies its signature, and passes the payload to the **AI Code Analyzer**.
4. The **AI Code Analyzer** fetches the pull request diff. It constructs a carefully designed prompt containing the entire code diff, asking the AI to focus on critical bugs and security vulnerabilities.
5. It sends this prompt to the selected AI API (Gemini or DeepSeek).
6. The AI API processes the request and returns structured feedback (e.g., a JSON array of comments).
7. The Analyzer parses this response.
8. The **Review Engine** takes the parsed feedback and posts it as both inline comments and PR-level summary comments on the GitHub pull request.

## 5. Project Structure
```
src/
├── api/                    # API routes organized by domain
│   ├── webhooks.ts        # GitHub webhook handlers
│   └── reviews.ts         # Review processing logic
├── services/              # Business logic services
│   ├── github.ts          # GitHub API client
│   ├── ai/                # AI integration
│   │   ├── ai-client.ts   # Abstract AI client
│   │   ├── gemini-client.ts # Gemini implementation
│   │   └── deepseek-client.ts # DeepSeek implementation
│   ├── code-reviewer.ts   # Review orchestration
│   └── webhook-handlers.ts # Webhook event handlers
├── types/                 # Shared TypeScript types
│   ├── index.ts           # Core types
│   └── ai.ts              # AI-specific types
├── utils/                 # Utility functions
│   ├── logger.ts          # Winston logger with rotation
│   ├── config.ts          # Configuration management
│   ├── webhook-security.ts # Security utilities
│   ├── ai-prompts.ts      # AI system prompts
│   ├── ai-response-parser.ts # AI response parsing utility
│   └── diff-processor.ts  # Diff processing utility
├── tests/                 # Test files
│   ├── setup.ts           # Test setup and mocks
│   ├── github.test.ts     # GitHub service tests
│   ├── ai-response-parser.test.ts # Parser tests
│   └── diff-processor.test.ts # Diff processor tests
└── index.ts              # Application entry point
```

## 6. Deployment Considerations
- **Vercel Functions**: Serverless architecture with potential cold start delays
- **Per-Repository Setup**: GitHub Actions workflow for selective deployment
- **Configuration**: Repository-specific settings via GitHub repository variables/secrets 