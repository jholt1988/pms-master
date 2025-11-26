import { Logger } from '@nestjs/common';
import { AIMetricsService } from './ai-metrics.service';

/**
 * Helper function to track AI service calls with metrics and structured logging
 */
export async function trackAICall<T>(
  metricsService: AIMetricsService | null,
  logger: Logger,
  serviceName: string,
  methodName: string,
  callFn: () => Promise<T>,
  options?: {
    estimateTokens?: (result: T) => { input: number; output: number };
    model?: string;
    cached?: boolean;
  },
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;
  let result: T;

  try {
    result = await callFn();
    success = true;

    const responseTime = Date.now() - startTime;
    let cost: number | undefined;

    // Estimate cost if token estimation is provided
    if (options?.estimateTokens && options?.model) {
      const tokens = options.estimateTokens(result);
      cost = metricsService?.estimateOpenAICost(options.model, tokens.input, tokens.output);
    }

    // Record metric
    if (metricsService) {
      metricsService.recordMetric({
        service: serviceName,
        method: methodName,
        responseTime,
        success: true,
        cached: options?.cached || false,
        cost,
      });
    }

    // Structured logging
    logger.log('AI service call completed', {
      service: serviceName,
      method: methodName,
      responseTime,
      success: true,
      cached: options?.cached || false,
      cost,
    });

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

    // Determine if this is a fallback scenario
    const isFallback = errorType === 'FallbackError' || error?.message?.includes('fallback');

    // Record metric
    if (metricsService) {
      metricsService.recordMetric({
        service: serviceName,
        method: methodName,
        responseTime,
        success: false,
        cached: false,
        errorType: isFallback ? 'FALLBACK' : errorType,
      });
    }

    // Structured logging
    logger.warn('AI service call failed', {
      service: serviceName,
      method: methodName,
      responseTime,
      success: false,
      errorType,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

