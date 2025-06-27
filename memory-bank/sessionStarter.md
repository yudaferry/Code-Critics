# Session Starter: Code Critics

## 🎯 **Project Overview**
Code Critics is a personal AI-powered GitHub code review application. It automatically analyzes pull requests using Gemini/DeepSeek AI models and posts intelligent feedback as GitHub comments.

## 📋 **Current Status**
- **Current Phase**: 🟨 **Phase 2 - GitHub Integration (Ready to Start)**
- **Next Step**: Begin coding the webhook server
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
├── src/                    # Source code (empty - ready for development)
├── dist/                   # Compiled JavaScript
├── memory-bank/            # Complete project documentation
├── package.json            # Dependencies and project metadata
├── yarn.lock               # Yarn lock file
├── shell.nix               # Nix development environment
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest testing configuration
├── vercel.json             # Deployment configuration
├── .env                    # Environment variables (with API keys)
├── env.example             # Environment template
└── .gitignore              # Git ignore rules
```

## 🚀 **Immediate Next Steps**
1. **Begin Phase 2**: Start development of the GitHub API client and webhook server.

## 🧠 **Key Decisions Made**
- **AI Strategy**: No fallback between models - return error if primary fails
- **Review Scope**: Critical bugs and security vulnerabilities only
- **Comment Style**: Both inline and PR-level summary comments
- **Configuration**: Per-repository via GitHub variables/secrets
- **Triggers**: Automatic on PR events + manual via `@codecritics` comment
- **Architecture**: Stateless, event-driven, cold start delays acceptable
- **Full Details**: See `activeContext.md` for complete decision context

## 📚 **Memory Bank Files**
- `projectbrief.md` - Core project purpose and goals
- `productContext.md` - Problem statement and user experience
- `systemPatterns.md` - Architecture and component design
- `techContext.md` - Technologies, libraries, and deployment
- `activeContext.md` - Current work focus and decisions
- `progress.md` - Detailed task breakdown and status
- `research_questions.md` - Strategic implementation decisions with recommendations
- `research/` - **Complete technical research knowledge base**:
  - `github-webhooks.md` - Webhook events, security, payload structures
  - `octokit-patterns.md` - GitHub API integration patterns
  - `ai-apis.md` - Gemini/DeepSeek integration and prompt engineering
  - `serverless-deployment.md` - Vercel optimization and deployment
  - `code-snippets.md` - Production-ready implementation examples
  - `research-summary.md` - Research completion status and key findings

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
- **All development happens within nix-shell** - no global installations

## 🎯 **Success Criteria**
- Analyze PRs and provide AI-driven feedback
- Zero false positives on critical issues
- Review response time under 30 seconds
- 99% uptime on Vercel deployment

This document ensures any AI session has complete context to continue development effectively.
