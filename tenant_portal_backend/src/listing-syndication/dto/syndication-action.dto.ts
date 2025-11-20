import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { SyndicationChannel } from '@prisma/client';

export class SyndicationActionDto {
  @IsOptional()
  @IsArray()
  @IsEnum(SyndicationChannel, { each: true })
  channels?: SyndicationChannel[];
}
