import { EsignProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested, IsEmail, IsUUID } from 'class-validator';

export class EnvelopeRecipientDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
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
