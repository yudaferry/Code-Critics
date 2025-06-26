# Code Critics

A GitHub code review app built with Node.js and TypeScript for automated code analysis and feedback.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub Personal Access Token and AI API keys
   ```

3. **Build and run**
   ```bash
   pnpm run build
   pnpm start
   ```

## 📋 Development Status

This project is currently in **Phase 1: Project Setup**

Check `memory-bank/progress.md` for detailed progress tracking.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm
- **GitHub API**: @octokit/rest
- **Webhooks**: @octokit/webhooks
- **Server**: Express.js
- **Deployment**: Vercel

## 📁 Project Structure

```
code-critics/
├── src/                 # Source code
├── dist/               # Compiled JavaScript
├── memory-bank/        # Project documentation
│   └── progress.md    # Development progress
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔧 Available Scripts

- `pnpm run dev` - Run in development mode
- `pnpm run build` - Build TypeScript to JavaScript
- `pnpm start` - Run compiled application
- `pnpm test` - Run tests
- `pnpm run lint` - Lint code
- `pnpm run format` - Format code

## 📝 License

MIT