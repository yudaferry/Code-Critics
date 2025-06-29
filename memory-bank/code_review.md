# Code Review Bots: Knowledge & References

## Project Focus
- This project is focused on building an AI/ML-powered code review bot using JavaScript/TypeScript-based GitHub Actions.
- The goal is to leverage external AI APIs (e.g., Gemini, DeepSeek, OpenAI) to analyze code changes and provide automated review feedback on pull requests.
- Static analysis and rule-based bots are not the primary focus.

## 1. Academic & Industry Articles
- **What to Expect from Code Review Bots on GitHub? A Survey with OSS Maintainers**
  - [Read on ACM](https://doi.org/10.1145/3422392.3422459)
  - [PDF (NSF)](https://par.nsf.gov/servlets/purl/10287966)
  - Key findings: Bots reduce manual effort, enforce code quality, but can introduce communication noise and intimidate newcomers.

- **Guidelines for Developing Bots for GitHub**
  - [arXiv PDF](https://arxiv.org/abs/2211.13063)
  - Summarizes best practices and guidelines for bot development on GitHub, including AI-powered bots.

- **Suggestion Bot: Analyzing the Impact of Automated Suggested Changes on Code Reviews**
  - [arXiv PDF](https://arxiv.org/pdf/2305.06328.pdf)
  - Explores the impact of bots that use AI and GitHub's suggested changes feature for concise, actionable feedback.

## 2. Open Source Projects
- **reviewdog**
  - [GitHub](https://github.com/reviewdog/reviewdog)
  - Automated code review tool that can be extended to use AI APIs for PR comments.

- **reviewbot**
  - [GitHub](https://github.com/qiniu/reviewbot)
  - Self-hosted code analysis and review service, supports multiple languages and AI-powered suggestions.

- **Awesome Actions**
  - [GitHub](https://github.com/sdras/awesome-actions)
  - Curated list of useful GitHub Actions, including many for code review and automation.

## 3. Best Practices & Guides
- **How to write custom GitHub Actions for code reviews**
  - [Graphite Guide](https://graphite.dev/guides/how-to-write-custom-github-actions-for-code-reviews)
  - Step-by-step guide for building custom review actions with JavaScript/TypeScript.

- **Reviewdog Documentation**
  - [Docs](https://github.com/reviewdog/reviewdog)
  - Explains how to integrate linters and automate review comments, and can be adapted for AI feedback.

## 4. Key Insights
- AI-powered code review bots can automate feedback, enforce standards, and speed up PR review.
- Human-bot interaction design is critical: avoid excessive noise, provide clear and actionable feedback, and support newcomers.
- Secure handling of API keys and secrets is essential for production bots. 