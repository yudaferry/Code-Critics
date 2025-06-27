# Session Starter: Code Critics

## 🎯 **Project Overview**
Code Critics is a personal AI-powered GitHub code review application. It automatically analyzes pull requests using Gemini/DeepSeek AI models and posts intelligent feedback as GitHub comments.

## 📋 **Current Status**
- **Current Phase**: 🟨 **Phase 2 - GitHub Integration (Nearly Complete - 5/6 tasks done)**
- **Next Step**: Test GitHub API connectivity (Task 2.6)
- **Full Details**: See `activeContext.md` for current work focus and `progress.md` for complete roadmap

## 🔧 **Technical Stack**
- **Runtime**: Node.js 22.x + TypeScript
- **Package Manager**: Yarn (v4+, managed by Corepack)
- **Server**: Express.js webhook endpoint
- **AI Models**: Gemini (primary), DeepSeek (secondary)
- **GitHub API**: @octokit/rest, @octokit/webhooks
- **Deployment**: Vercel serverless functions (CLI v44.2.7)
- **Environment**: Complete nix-shell encapsulation (OS isolation)
- **Full Details**: See `techContext.md` for detailed explanations and reasoning

## 📁 **Project Structure**
```
code-critics/
├── .yarn/                  # Yarn installation and configuration
├── src/                    # Source code (Phase 2 implementation)
│   ├── services/           # GitHub, AI, and webhook services
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Logger, config, security utilities
│   └── index.ts            # Enhanced Express server
├── api/                    # Vercel API endpoints
│   └── webhooks.ts         # Main webhook handler
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
├── env.example             # Environment template
└── .gitignore              # Git ignore rules
```

## 🚀 **Immediate Next Steps**
1. **Complete Phase 2**: Test GitHub API connectivity (Task 2.6)
2. **Begin Phase 3**: Start AI integration and review logic implementation

## 🧠 **Key Decisions Made**
- **AI Strategy**: Primary (Gemini) with secondary (DeepSeek) fallback and logging
- **Review Scope**: Critical bugs and security vulnerabilities only
- **Comment Style**: Both inline and PR-level summary comments
- **Configuration**: Per-repository via GitHub variables/secrets
- **Triggers**: Automatic on PR events + manual via `@codecritics` comment
- **Architecture**: Stateless, event-driven, cold start delays acceptable
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
GITHUB_TOKEN=your_personal_access_token_here
WEBHOOK_SECRET=your_webhook_secret_here
GEMINI_API_KEY=${GEMINI_API_KEY}  # From OS environment
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}  # From OS environment
PORT=3000  # Optional, defaults to 3000
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
```

### Key File Locations
- **Main webhook handler**: `api/webhooks.ts`
- **GitHub service**: `src/services/github.ts`
- **Security utilities**: `src/utils/webhook-security.ts`
- **Configuration**: `src/utils/config.ts`
- **Environment template**: `env.example`

### Session Validation Checklist
- [ ] Current phase: Phase 2 (5/6 tasks complete)
- [ ] Next task: Test GitHub API connectivity (Task 2.6)
- [ ] No blockers identified
- [ ] Environment: nix-shell required
- [ ] AI strategy: Gemini primary, DeepSeek fallback with logging

This document ensures any AI session has complete context to continue development effectively.
