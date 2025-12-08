import { Type } from 'class-transformer';
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  ValidateNested, 
  IsDateString, 
  IsObject 
} from 'class-validator';

// 1. Nested DTO for the 'data' object
// This contains the actual business logic details (envelope ID, status, recipients)
class DocuSignEnvelopeDataDto {
  @IsString()
  @IsOptional()
  accountId: string;

  @IsString()
  @IsOptional()
  userId: string;

  @IsString()
  @IsOptional()
  envelopeId: string;

  // DocuSign sends a very large 'envelopeSummary' object here.
  // Using @IsOptional() and @IsObject() allows it to pass without 
  // defining every single nested field inside the summary.
  @IsObject()
  @IsOptional()
  envelopeSummary: any; 
}

// 2. The Main Root DTO
// This matches the top-level JSON causing your current 400 error
export class ProviderWebhookDto {
  @IsString()
  @IsOptional()
  event: string; // e.g., "envelope-sent"

  @IsString()
  @IsOptional()
  apiVersion: string; // The field that caused your error

  @IsString()
  @IsOptional()
  uri: string; // The other field that caused your error

  @IsNumber()
  @IsOptional()
  retryCount: number;

  @IsNumber()
  @IsOptional()
  configurationId: number;

  @IsDateString()
  @IsOptional()
  generatedDateTime: string;

  @ValidateNested()
  @Type(() => DocuSignEnvelopeDataDto)
  data: DocuSignEnvelopeDataDto;
}

export class ProviderWebhookDocumentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  contentBase64?: string;
}