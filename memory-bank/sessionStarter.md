# Session Starter: Code Critics

## 🎯 **Project Overview**
Code Critics is a personal AI-powered GitHub code review application. It automatically analyzes pull requests using Gemini/DeepSeek AI models and posts intelligent feedback as GitHub comments.

## 📋 **Current Status**
- **Phase**: Project Setup (Phase 1) - 95% Complete
- **Next Phase**: GitHub Integration (Phase 2)
- **Architecture**: Webhook-driven, stateless, Vercel serverless deployment
- **Development**: Multi-session spare-time project

## 🔧 **Technical Stack**
- **Runtime**: Node.js 22.x + TypeScript
- **Package Manager**: pnpm
- **Server**: Express.js webhook endpoint
- **AI Models**: Gemini (primary), DeepSeek (secondary)
- **GitHub API**: @octokit/rest, @octokit/webhooks
- **HTTP Client**: axios
- **Deployment**: Vercel serverless functions

## 📁 **Project Structure**
```
code-critics/
├── src/                    # Source code (empty - ready for development)
├── dist/                   # Compiled JavaScript
├── memory-bank/            # Complete project documentation
├── package.json            # Dependencies configured
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Deployment configuration
├── .env                    # Environment variables (with API keys)
├── .env.example            # Environment template
└── .gitignore              # Security configured
```

## 🚀 **Immediate Next Steps**
1. **Install dependencies**: `pnpm install`
2. **Update .env**: Add actual GitHub Personal Access Token
3. **Begin Phase 2**: Create basic webhook server structure

## 🧠 **Key Decisions Made**
- **AI Strategy**: No fallback between models - return error if primary fails
- **Review Scope**: Critical bugs and security vulnerabilities only
- **Comment Style**: Both inline and PR-level summary comments
- **Configuration**: Per-repository via GitHub variables/secrets
- **Triggers**: Automatic on PR events + manual via `@codecritics` comment
- **Architecture**: Stateless, event-driven, cold start delays acceptable

## 📚 **Memory Bank Files**
- `projectbrief.md` - Core project purpose and goals
- `productContext.md` - Problem statement and user experience
- `systemPatterns.md` - Architecture and component design
- `techContext.md` - Technologies, libraries, and deployment
- `activeContext.md` - Current work focus and decisions
- `progress.md` - Detailed task breakdown and status

## 🔑 **Environment Variables**
```bash
GITHUB_TOKEN=your_personal_access_token_here
GEMINI_API_KEY=${GEMINI_API_KEY}  # From OS environment
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}  # From OS environment
```

## 💡 **Development Notes**
- Each session should start by reading ALL memory bank files
- Project designed for iterative development across multiple sessions
- Prompt engineering will be critical and iterative
- Focus on MVP first, enhance incrementally
- Local testing uses Cloudflare Tunnel for webhooks

## 🎯 **Success Criteria**
- Analyze PRs and provide AI-driven feedback
- Zero false positives on critical issues
- Review response time under 30 seconds
- 99% uptime on Vercel deployment

This document ensures any AI session has complete context to continue development effectively.
