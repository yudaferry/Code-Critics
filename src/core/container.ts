/**
 * @fileoverview Dependency Injection Container
 * 
 * This module provides a simple dependency injection container that manages
 * service instances and their dependencies, promoting loose coupling and
 * better testability throughout the application.
 * 
 * @author Code Critics Team
 * @version 1.0.0
 */

import { GitHubService } from '../services/github';
import { CodeReviewService } from '../services/code-reviewer';
import { AIClient } from '../services/ai-client';
import { GeminiClient } from '../services/gemini-client';
import { DeepSeekClient } from '../services/deepseek-client';
import { Logger } from '../utils/logger';
import { AIResponseParser } from '../utils/ai-response-parser';
import { DiffProcessor } from '../utils/diff-processor';
import config from '../utils/config';

/**
 * Service registry for dependency injection
 */
export interface ServiceRegistry {
  logger: Logger;
  githubService: GitHubService;
  aiClient: AIClient;
  aiResponseParser: AIResponseParser;
  diffProcessor: DiffProcessor;
  codeReviewService: CodeReviewService;
}

/**
 * Dependency injection container
 * 
 * Manages service instances and their dependencies using the singleton pattern
 * for each service type. Services are lazily instantiated when first requested.
 */
export class Container {
  private services: Partial<ServiceRegistry> = {};

  /**
   * Gets or creates a Logger instance
   * 
   * @returns Logger instance
   */
  getLogger(): Logger {
    if (!this.services.logger) {
      this.services.logger = new Logger();
    }
    return this.services.logger;
  }

  /**
   * Gets or creates a GitHubService instance
   * 
   * @returns GitHubService instance with logger dependency
   */
  getGitHubService(): GitHubService {
    if (!this.services.githubService) {
      this.services.githubService = new GitHubService(
        undefined, // Use default Octokit instance
        this.getLogger()
      );
    }
    return this.services.githubService;
  }

  /**
   * Gets or creates an AIClient instance
   * 
   * Creates the appropriate AI client based on configuration with fallback support.
   * 
   * @returns AIClient instance
   */
  getAIClient(): AIClient {
    if (!this.services.aiClient) {
      const logger = this.getLogger();
      const aiProvider = config.AI_PROVIDER;
      const geminiKey = process.env.GEMINI_API_KEY;
      const deepseekKey = process.env.DEEPSEEK_API_KEY;

      logger.info('Initializing AI client via container', { provider: aiProvider });

      try {
        if (aiProvider === 'gemini') {
          if (!geminiKey) throw new Error('GEMINI_API_KEY is not set but AI_PROVIDER is gemini');
          logger.info('Using Gemini as primary AI provider');
          this.services.aiClient = new GeminiClient(geminiKey);
        } else if (aiProvider === 'deepseek') {
          if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY is not set but AI_PROVIDER is deepseek');
          logger.info('Using DeepSeek as primary AI provider');
          this.services.aiClient = new DeepSeekClient(deepseekKey);
        } else {
          throw new Error(`Unknown AI provider: ${aiProvider}`);
        }
      } catch (error) {
        logger.warn(`Failed to initialize ${aiProvider} client, attempting fallback`, error as Error);

        try {
          if (aiProvider === 'gemini' && deepseekKey) {
            logger.info('Fallback to DeepSeek AI provider');
            this.services.aiClient = new DeepSeekClient(deepseekKey);
          } else if (aiProvider === 'deepseek' && geminiKey) {
            logger.info('Fallback to Gemini AI provider');
            this.services.aiClient = new GeminiClient(geminiKey);
          } else {
            throw new Error('No fallback AI provider available - ensure at least one valid API key is configured');
          }
        } catch (fallbackError) {
          logger.error('Failed to initialize both primary and fallback AI providers', fallbackError as Error);
          throw new Error('Failed to initialize any AI provider. Check API keys and provider configuration.');
        }
      }
    }
    return this.services.aiClient;
  }

  /**
   * Gets or creates an AIResponseParser instance
   * 
   * @returns AIResponseParser instance with logger dependency
   */
  getAIResponseParser(): AIResponseParser {
    if (!this.services.aiResponseParser) {
      this.services.aiResponseParser = new AIResponseParser();
    }
    return this.services.aiResponseParser;
  }

  /**
   * Gets or creates a DiffProcessor instance
   * 
   * @returns DiffProcessor instance with logger dependency
   */
  getDiffProcessor(): DiffProcessor {
    if (!this.services.diffProcessor) {
      this.services.diffProcessor = new DiffProcessor();
    }
    return this.services.diffProcessor;
  }

  /**
   * Gets or creates a CodeReviewService instance
   * 
   * @returns CodeReviewService instance with all dependencies injected
   */
  getCodeReviewService(): CodeReviewService {
    if (!this.services.codeReviewService) {
      this.services.codeReviewService = new CodeReviewService(
        this.getGitHubService(),
        this.getAIClient(),
        this.getAIResponseParser(),
        this.getLogger(),
        this.getDiffProcessor()
      );
    }
    return this.services.codeReviewService;
  }

  /**
   * Resets all services (useful for testing)
   * 
   * Clears all cached service instances, forcing them to be recreated
   * on next access. This is primarily useful for testing scenarios.
   */
  reset(): void {
    this.services = {};
  }

  /**
   * Registers a custom service instance
   * 
   * Allows overriding the default service creation logic with a custom instance.
   * This is useful for testing or when you need to provide a specific implementation.
   * 
   * @param serviceName - Name of the service to register
   * @param instance - Service instance to register
   */
  register<K extends keyof ServiceRegistry>(serviceName: K, instance: ServiceRegistry[K]): void {
    this.services[serviceName] = instance;
  }

  /**
   * Gets all registered services
   * 
   * @returns Partial registry of all currently instantiated services
   */
  getAll(): Partial<ServiceRegistry> {
    return { ...this.services };
  }
}

/**
 * Default container instance
 * 
 * This is the main container instance used throughout the application.
 * It can be imported and used directly, or you can create your own
 * container instance for testing or special use cases.
 */
export const container = new Container(); 