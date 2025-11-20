import { EsignProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class EnvelopeRecipientDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}

export class CreateEnvelopeDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvelopeRecipientDto)
  recipients!: EnvelopeRecipientDto[];

  @IsOptional()
  @IsEnum(EsignProvider)
  provider?: EsignProvider;
}
