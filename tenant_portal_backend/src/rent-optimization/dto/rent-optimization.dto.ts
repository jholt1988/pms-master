import { IsArray, IsNumber, IsOptional, IsString, Min, Max, ArrayMinSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for generating rent recommendations
 */
export class GenerateRecommendationsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one unit ID is required' })
  @IsNumber({}, { each: true, message: 'Each unit ID must be a number' })
  @Type(() => Number)
  unitIds!: number[];
}

/**
 * DTO for updating a rent recommendation
 */
export class UpdateRecommendationDto {
  @IsNumber()
  @Min(0.01, { message: 'Recommended rent must be greater than 0' })
  @Max(1000000, { message: 'Recommended rent must be less than 1,000,000' })
  @Type(() => Number)
  recommendedRent!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Reasoning must be less than 1000 characters' })
  reasoning?: string;
}

