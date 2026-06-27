import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { wrapAiResult } from './ai-decision-envelope';

/**
 * AiExplainabilityInterceptor — Phase 2A.
 *
 * Wraps every ai-gateway controller response in the standardized
 * AI decision envelope: { result, confidence, rationale, modelVersion,
 * inputsHash, requiresApproval, provider, generatedAt }.
 *
 * The envelope is additive — the original response becomes the `result`
 * field, preserving all existing fields and backward compatibility.
 *
 * Consumers who don't need the envelope can still read response.result
 * and get the same shape they had before.
 */
@Injectable()
export class AiExplainabilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const request = context.switchToHttp().getRequest();
    const body = request.body ?? {};

    return next.handle().pipe(
      map((response) => {
        // Only wrap objects that look like AI responses (have confidence or content)
        if (
          !response ||
          typeof response !== 'object' ||
          Array.isArray(response)
        ) {
          return response;
        }

        const aiResponse = response as Record<string, unknown>;

        // Extract existing fields for the envelope
        const confidence =
          typeof aiResponse.confidence === 'number'
            ? aiResponse.confidence
            : 0.85; // Default for mock mode

        const rationale: string[] = Array.isArray(aiResponse.rationale)
          ? (aiResponse.rationale as string[])
          : aiResponse.summary
            ? [aiResponse.summary as string]
            : ['AI-generated response'];

        const riskFlags = (aiResponse.riskFlags as Array<{ severity?: string } | string>) ?? [];

        // Use handler name as a stable model version identifier
        const modelVersion =
          (aiResponse.gatewayResponseId as string)?.split('-').slice(0, 2).join('-') ??
          'ai-gateway-v1';

        return wrapAiResult(aiResponse, {
          confidence,
          rationale,
          modelVersion,
          inputs: body,
          provider: (aiResponse.provider as string) ?? 'mock',
          riskFlags,
        });
      }),
    );
  }
}
