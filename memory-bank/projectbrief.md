# Project Brief: Code Critics

## 1. Project Purpose
Code Critics is a personal, AI-powered code review application that integrates with GitHub. It is designed to automatically analyze pull requests in personal repositories and provide intelligent feedback using generative AI models like Google's Gemini or DeepSeek.

## 2. Core Problem
Individual developers often lack the immediate, critical feedback on their code that a team environment provides. This tool aims to fill that gap by providing an automated, AI-driven reviewer that can spot potential issues, suggest improvements, and enforce coding standards, thereby improving code quality and accelerating personal learning.

## 3. Key Goals
- **Automate Code Reviews**: Automatically trigger reviews on GitHub pull request events.
- **Provide AI-Powered Feedback**: Use large language models to analyze code changes for quality, correctness, and style.
- **Integrate Seamlessly with GitHub**: Post review comments directly on pull requests.
- **Be Configurable**: Allow the user to set rules and choose the AI model.

## 4. Scope
- **In-Scope**: Personal GitHub repositories, analysis of pull request diffs, integration with Gemini/DeepSeek APIs, posting comments.
- **Out-of-Scope**: Support for enterprise features, team collaboration, CI/CD pipeline integration (in initial versions), reviewing entire codebases at once.

## 5. Success Metrics
- **Functionality**: Successfully analyzes pull requests and provides meaningful, AI-driven feedback.
- **Accuracy**: Zero false positives on critical bug and security vulnerability suggestions.
- **Performance**: Review response time under 30 seconds.
- **Reliability**: Service uptime greater than 99% once deployed to Vercel. 