# Tech Context: Code Critics

## 1. Core Technologies
- **Runtime**: Node.js 22.x
  - **Reason**: Chosen for its event-driven nature, which is ideal for a webhook-based server. The vast npm ecosystem provides excellent tools for building this application.
- **Language**: TypeScript
  - **Reason**: Provides static typing, improving code quality, maintainability, and developer experience, which is crucial for a project dealing with complex API structures.

## 2. Key Libraries & APIs
- **GitHub Integration**: `@octokit/rest`
  - **Purpose**: The official GitHub REST API client for Node.js. It will be used for all interactions with GitHub, such as posting comments and checking PR statuses.
- **Webhook Framework**: `@octokit/webhooks`
  - **Purpose**: Handle GitHub webhook events with proper signature verification.
- **Web Server**: Express.js
  - **Purpose**: To build the webhook server endpoint. It's robust, well-documented, and easy to set up.
- **AI Integration**: 
  - **Gemini**: `@google/generative-ai` (Primary - free tier)
  - **DeepSeek**: `axios` for HTTP client (Secondary - cheap alternative)
  - **Purpose**: To make API calls to the chosen AI service. Gemini is default, DeepSeek as backup.
- **Environment Variables**: `dotenv`
  - **Purpose**: To load environment variables from a `.env` file into `process.env`, which is standard practice for managing configuration and secrets in development.

## 3. Development Environment
- **Package Manager**: `pnpm` (faster installs, better disk efficiency than npm)
- **Local Webhook Tunneling**: Cloudflare Tunnel
  - **Purpose**: To expose the local development server to the internet so it can receive webhooks from GitHub for testing purposes.
- **Code Formatting**: Prettier
  - **Purpose**: To maintain a consistent code style across the project.
- **Linting**: ESLint
  - **Purpose**: To identify and fix common coding errors and enforce best practices.

## 4. Authentication
- **GitHub**: Personal Access Token (PAT) stored in `.env` as `GITHUB_TOKEN`.
- **AI Service**: API Keys stored as OS environment variables:
  - `GEMINI_API_KEY` (Primary - free tier preferred)
  - `DEEPSEEK_API_KEY` (Secondary - cheap alternative)
- **Deployment**: For production, secrets will be managed via Vercel environment variables.

## 6. Development Workflow
- **Version Control**: GitFlow branching strategy
  - `main`: Production-ready code. Only accepts merges from `release/*` and `hotfix/*`
  - `develop`: Main development branch. All `feature/*` branches are based on and merged back into `develop`
  - `feature/[issue-id]-description`: For new features
- **Commits**: Follow Conventional Commits specification
  - Format: `type(scope): description` (e.g., `feat(api): add webhook signature validation`)
  - Commits should be small, atomic, and represent a single logical change
- **Pull Requests**: All changes to `develop` and `main` must go through a PR with clear descriptions

## 7. Testing Strategy
- **Framework**: Vitest for unit and integration tests
- **Priority**: Write tests for critical logic, especially API interactions, webhook processing, and business logic
- **Coverage**: Test success cases, error conditions, and edge cases
- **AI Testing**: Mock AI responses for consistent testing scenarios 