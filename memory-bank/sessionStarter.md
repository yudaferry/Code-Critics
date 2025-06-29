# Session Starter: Code Critics

## 🎯 **Project Overview**
Code Critics is a personal AI-powered GitHub code review application. It automatically analyzes pull requests using Gemini/DeepSeek AI models and posts intelligent feedback as GitHub comments.

## 📋 **Current Status**
- **Current Phase**: 🟨 **Phase 4 - Testing & Deployment (Starting)**
- **Next Step**: Write unit and integration tests for core logic and API interactions (Task 4.1)
- **Full Details**: See `activeContext.md` for current work focus and `progress.md` for complete roadmap

## 🔧 **Technical Stack**
- **Runtime**: Node.js 22.x + TypeScript
- **Package Manager**: Yarn (v4+, managed by Corepack)
- **Server**: Express.js webhook endpoint
- **AI Models**: Gemini (primary), DeepSeek (secondary)
- **GitHub API**: @octokit/rest, @octokit/webhooks
- **Deployment**: Vercel serverless functions (CLI v44.2.7)
- **Environment**: Complete nix-shell encapsulation (OS isolation)
- **Logging**: Winston with daily rotation (30-day retention)
- **Full Details**: See `techContext.md` for detailed explanations and reasoning

## 📁 **Project Structure**
```
code-critics/
├── .yarn/                  # Yarn installation and configuration
├── src/                    # Source code (Phase 3 implementation)
│   ├── services/           # GitHub, AI, and webhook services
│   │   ├── github.ts       # GitHub API client
│   │   ├── ai-client.ts    # Abstract AI client
│   │   ├── gemini-client.ts # Gemini implementation
│   │   ├── deepseek-client.ts # DeepSeek implementation
│   │   ├── code-reviewer.ts # Review orchestration
│   │   └── webhook-handlers.ts # Webhook event handlers
│   ├── types/              # TypeScript interfaces
│   │   ├── index.ts        # Core types
│   │   └── ai.ts           # AI-specific types
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Winston logger with rotation
│   │   ├── config.ts       # Configuration management
│   │   ├── webhook-security.ts # Security utilities
│   │   ├── ai-prompts.ts   # AI system prompts
│   │   ├── ai-response-parser.ts # AI response parsing utility
│   │   └── diff-processor.ts # Diff processing utility
│   ├── tests/              # Test files
│   │   ├── setup.ts        # Test setup and mocks
│   │   ├── github.test.ts  # GitHub service tests
│   │   ├── ai-response-parser.test.ts # Parser tests
│   │   └── diff-processor.test.ts # Diff processor tests
│   └── index.ts            # Express server with webhook endpoint
├── api/                    # Vercel API endpoints
│   └── webhooks.ts         # Main webhook handler
├── logs/                   # Log files (daily rotation)
├── AI-tools/               # Custom development tools
│   └── vercel.tool.sh      # Deployment logs and URL discovery
├── memory-bank/            # Complete project documentation
│   ├── research/           # Technical research (35+ references)
│   └── *.md                # Core documentation files
├── dist/                   # Compiled JavaScript
├── package.json            # Dependencies and project metadata
├── yarn.lock               # Yarn lock file
├── shell.nix               # Nix development environment
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest testing configuration
├── vercel.json             # Deployment configuration
├── test-webhook.js         # Local testing utility
├── .env                    # Environment variables (with API keys)
├── env.example            # Environment template
└── .gitignore              # Git ignore rules
```

## 🚀 **Immediate Next Steps**
1. **Begin Phase 4**: Write unit and integration tests (Task 4.1)
2. **Set up CI/CD**: Configure GitHub Actions for automated testing and deployment (Task 4.2)
3. **Deploy to Vercel**: Set up production deployment (Task 4.3)

## 🧠 **Key Decisions Made**
- **AI Strategy**: Primary (Gemini) with secondary (DeepSeek) fallback and logging
- **Review Scope**: Critical bugs and security vulnerabilities only
- **Comment Style**: Both inline and PR-level summary comments
- **Configuration**: Per-repository via GitHub variables/secrets
- **Triggers**: Automatic on PR events + manual via `@codecritics` comment
- **Architecture**: Stateless, event-driven, cold start delays acceptable
- **Logging**: Winston with daily rotation and 30-day retention
- **Code Quality**: Achieved 100% quality score through comprehensive optimization
- **Testing Approach**: Test-driven development with comprehensive test setup
- **Memory Optimization**: Streaming processing for large diffs
- **Full Details**: See `activeContext.md` for complete decision context

## 📚 **Memory Bank Files**

### Core Files (Essential for Every Session)
- `projectbrief.md` - Fundamental project purpose, scope, and success metrics
- `productContext.md` - Problem statement and user experience design
- `systemPatterns.md` - Architecture patterns and component relationships
- `techContext.md` - Technologies, tools, deployment, and development workflow
- `activeContext.md` - Current work focus, recent accomplishments, and next actions
- `progress.md` - Detailed phase breakdown, task status, and milestone tracking

### Supporting Documentation (Reference as Needed)
- `development-tools.md` - Custom tools (Vercel tool, testing utilities, health checks)

### Research Knowledge Base (Technical Reference)
- `research/github-webhooks.md` - Webhook events, security, payload structures
- `research/octokit-patterns.md` - GitHub API integration patterns and error handling
- `research/ai-apis.md` - Gemini/DeepSeek integration and prompt engineering
- `research/serverless-deployment.md` - Vercel optimization and deployment strategies
- `research/code-snippets.md` - Production-ready implementation examples
- `research/research-summary.md` - Research completion status and key findings

## 🔑 **Environment Variables**
```bash
# GitHub Authentication
GITHUB_TOKEN=your_github_personal_access_token
WEBHOOK_SECRET=your_webhook_secret

# AI Provider Configuration
AI_PROVIDER=gemini  # Options: gemini, deepseek
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# Application Configuration
PORT=3000
NODE_ENV=development  # Options: development, production, test
LOG_LEVEL=info  # Options: debug, info, warn, error
MAX_DIFF_SIZE=100000  # Maximum diff size in characters

# Security Configuration
ALLOWED_REPOSITORIES=owner/repo1,owner/repo2  # Optional: comma-separated list of allowed repositories
```
*See `env.example` for template and `techContext.md` for authentication details*

## 💡 **Development Notes**
- Each session should start by reading ALL memory bank files
- Project designed for iterative development across multiple sessions
- Prompt engineering will be critical and iterative
- Focus on MVP first, enhance incrementally
- Local testing uses Cloudflare Tunnel for webhooks

## 🔧 **Development Tools**
- **Vercel Tool**: `AI-tools/vercel.tool.sh` for deployment logs and URL discovery
  - `./AI-tools/vercel.tool.sh logs` - Get deployment logs for debugging
  - `./AI-tools/vercel.tool.sh url` - Get production URL for testing
  - Only works in nix-shell environment for safety
- **Testing Script**: `test-webhook.js` for local webhook endpoint testing
- **Health Endpoint**: `/health` for comprehensive service status checks
- **All development happens within nix-shell** - no global installations

## 🎯 **Success Criteria**
- Analyze PRs and provide AI-driven feedback
- Zero false positives on critical issues
- Review response time under 30 seconds
- 99% uptime on Vercel deployment

## 📋 **Quick Reference for AI Sessions**

### Essential Reading Order
1. **`sessionStarter.md`** (this file) - Complete overview and current status
2. **`activeContext.md`** - Current work focus and recent accomplishments  
3. **`progress.md`** - Detailed task status and next steps
4. **Reference files as needed** - techContext.md, systemPatterns.md, research/

### Common Commands
```bash
# Development
yarn dev                              # Start local server
./AI-tools/vercel.tool.sh url        # Get production URL
./AI-tools/vercel.tool.sh logs       # Get deployment logs
node test-webhook.js                 # Test webhook locally

# Health checks
curl localhost:3000/health           # Local health check
curl $PROD_URL/health                # Production health check

# Testing
yarn test                            # Run tests
```

### Key File Locations
- **Main webhook handler**: `src/index.ts`
- **GitHub service**: `src/services/github.ts`
- **AI clients**: `src/services/ai-client.ts`, `src/services/gemini-client.ts`, `src/services/deepseek-client.ts`
- **Code reviewer**: `src/services/code-reviewer.ts`
- **Security utilities**: `src/utils/webhook-security.ts`
- **Configuration**: `src/utils/config.ts`
- **Environment template**: `env.example`

### Session Validation Checklist
- [ ] Current phase: Phase 4 (0/4 tasks complete)
- [ ] Next task: Write unit and integration tests (Task 4.1)
- [ ] No blockers identified
- [ ] Environment: nix-shell required
- [ ] AI strategy: Gemini primary, DeepSeek fallback with logging

This document ensures any AI session has complete context to continue development effectively.
