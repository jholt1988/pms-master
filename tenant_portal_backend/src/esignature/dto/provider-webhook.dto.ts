import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ProviderWebhookParticipantDto {
  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  status?: string;
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

export class ProviderWebhookDto {
  @IsString()
  envelopeId!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderWebhookParticipantDto)
  participants?: ProviderWebhookParticipantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderWebhookDocumentDto)
  documents?: ProviderWebhookDocumentDto[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
