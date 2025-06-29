# Code Critics

A GitHub code review app built with Node.js and TypeScript for automated code analysis and feedback.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub Personal Access Token and AI API keys
   ```

3. **Build and run**
   ```bash
   yarn build
   yarn start
   ```

## 📋 Development Status

This project is currently in **Phase 3: Core AI Review Logic (Complete)**

Check `memory-bank/progress.md` for detailed progress tracking.

## 🧠 AI Configuration

Code Critics supports multiple AI providers:

- **Gemini** (Default): Google's Gemini Pro model
- **DeepSeek**: DeepSeek Coder model as a fallback option

Configure your preferred provider in `.env`:

```
AI_PROVIDER=gemini  # Options: gemini, deepseek
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

The system will automatically fall back to the secondary provider if the primary one fails.

## 🛠️ Tech Stack

- **Runtime**: Node.js 22.x
- **Language**: TypeScript
- **Package Manager**: Yarn (v4+, managed by Corepack)
- **GitHub API**: @octokit/rest
- **Webhooks**: @octokit/webhooks
- **Server**: Express.js
- **Deployment**: Vercel

## 📁 Project Structure

```
code-critics/
├── src/                 # Source code (ready for development)
├── dist/               # Compiled JavaScript
├── memory-bank/        # Project documentation
│   └── progress.md    # Development progress
├── package.json
├── yarn.lock
├── tsconfig.json
└── env.example
```

## 🔧 Available Scripts

- `yarn dev` - Run in development mode
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Run compiled application
- `yarn test` - Run tests
- `yarn lint` - Lint code
- `yarn format` - Format code

## 📝 License

MIT

## Deploying to Vercel

1. Ensure your Express app is exported from `src/index.ts` (already set up).
2. The Vercel entry point is `api/index.ts`.
3. The `vercel.json` routes all requests to the API handler.
4. Push your code to GitHub.
5. In the Vercel dashboard:
   - Import your repository.
   - Set required environment variables (e.g., `GITHUB_TOKEN`, `WEBHOOK_SECRET`, etc.).
   - Deploy the project.
6. Test your deployment at the provided Vercel URL (e.g., `/health`).