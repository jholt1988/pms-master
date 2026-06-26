import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Minimal typed DTO for POST /property-os/v16/analyze.
 *
 * The downstream reference engine accepts a flexible request payload, so this
 * DTO intentionally keeps a permissive shape (additional properties are passed
 * through) while replacing the previous untyped `@Body() body: any` with a
 * validated object that at least guarantees the request body is an object and
 * that the optional `id` (used for inspection correlation) is a string.
 */
export class AnalyzeV16RequestDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsObject()
  inspection?: Record<string, unknown>;

  // Allow additional engine-specific fields to pass through without being
  // stripped or rejected.
  [key: string]: unknown;
}
