import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { SyndicationChannel } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class UpsertChannelCredentialDto {
  @IsEnumSafe(SyndicationChannel)
  channel: SyndicationChannel;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  ftpHost?: string;

  @IsOptional()
  @IsString()
  ftpUsername?: string;

  @IsOptional()
  @IsString()
  ftpPassword?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
