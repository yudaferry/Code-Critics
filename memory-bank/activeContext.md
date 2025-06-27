# Active Context: Code Critics

## Current Work Focus
**Current Phase**: 🟨 **Phase 2 - GitHub Integration (Ready to Start)**  
*(See `progress.md` for the full project roadmap.)*

**Immediate Goal**: Build the foundational components for receiving and handling GitHub webhooks.

**Next Actions**:
1. Create the basic directory structure inside `/src`
2. Implement a basic Express server as the webhook entry point
3. Set up the Octokit client for GitHub API communication
4. Implement webhook signature verification for security

## Recent Accomplishments (Completed Phase 1)
- Migrated from `pnpm` to Yarn (v4+) managed by Corepack.
- Established a reproducible development environment with `shell.nix`.
- Successfully installed all project dependencies.
- Refined the Memory Bank documentation structure.
- Project is ready to begin Phase 2 implementation.

## Key Decisions for Current Phase
- The webhook server will listen for `pull_request` and `issue_comment` events.
- All incoming webhooks must be validated using the webhook secret.
- The Octokit client will be initialized with the `GITHUB_TOKEN`.

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
- **Nix-based Environment**: Using `shell.nix` to ensure consistent tooling.
- Event-driven webhook architecture
- Stateless service design
- Vercel serverless deployment (cold start delays acceptable)
- **Yarn via Corepack**: Using modern Yarn for dependency management, pinned per-project.
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