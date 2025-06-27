# Code Critics

A GitHub code review app built with Node.js and TypeScript for automated code analysis and feedback.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your GitHub Personal Access Token and AI API keys
   ```

3. **Build and run**
   ```bash
   yarn build
   yarn start
   ```

## 📋 Development Status

This project is currently in **Phase 2: GitHub Integration (Ready to Start)**

Check `memory-bank/progress.md` for detailed progress tracking.

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