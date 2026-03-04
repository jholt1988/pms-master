import { EsignProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested, IsEmail, IsUUID } from 'class-validator';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

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
  @IsEnumSafe(EsignProvider)
  provider?: EsignProvider;
}
