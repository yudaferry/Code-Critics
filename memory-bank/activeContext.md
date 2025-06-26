# Active Context: Code Critics

## Current Work Focus
**Phase**: Project Setup (Phase 1) - **Nearly Complete**
**Immediate Goal**: Complete final setup tasks before beginning development

**Next Actions**:
1. **URGENT**: Install dependencies (`pnpm install`)
2. **URGENT**: Update `.env` file with actual GitHub Personal Access Token
3. Begin Phase 2: GitHub API client and webhook server

## Recent Changes & Insights
- Memory Bank structure established following MCP guidelines
- Project shifted to AI-first approach for code review (vs traditional static analysis)
- Documentation consolidated into proper memory bank hierarchy
- All project clarifications completed - ready for development
- Node.js 22 + pnpm configuration finalized
- All dependencies and configuration files created

## Active Decisions & Patterns
**AI Integration Strategy**:
- Gemini as primary model (free tier), DeepSeek as secondary (cheap)
- API keys stored in OS environment: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`
- No fallback between models - return error if primary fails
- Entire PR diff sent to AI in single request for MVP
- Focus strictly on critical bugs and security vulnerabilities
- Manual trigger via `@codecritics` comment + automatic on PR events

**GitHub Integration**:
- Reusable GitHub Actions workflow for per-repository setup
- Both inline comments and PR-level summary comments
- Stateless operation - no review history retention
- Configuration via GitHub repository variables/secrets
- Personal Access Token authentication using `GITHUB_TOKEN`

**Technical Patterns**:
- Event-driven webhook architecture
- Stateless service design
- Vercel serverless deployment (cold start delays acceptable)
- Node.js 22 runtime with pnpm package manager
- TypeScript for type safety
- Axios for HTTP client (DeepSeek API calls)
- Express.js for webhook server

**Development Approach**:
- Multi-session development (spare time project)
- Iterative prompt engineering
- Start simple, enhance incrementally
- Local development with Cloudflare Tunnel for webhook testing
- Vercel deployment for production

## Current Considerations
- Prompt engineering will be critical and iterative
- Need flexible AI client interface for easy model switching
- Rate limiting strategies for both GitHub and AI APIs
- Error handling and retry logic for webhook reliability
- Cold start delays (1-3 seconds) acceptable for personal use
- Each AI session must be self-contained with complete context 