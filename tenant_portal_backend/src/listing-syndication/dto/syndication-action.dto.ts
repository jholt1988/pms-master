import { IsArray, IsOptional } from 'class-validator';
import { SyndicationChannel } from '@prisma/client';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export class SyndicationActionDto {
  @IsOptional()
  @IsArray()
  @IsEnumSafe(SyndicationChannel, { each: true })
  channels?: SyndicationChannel[];
}
