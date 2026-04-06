import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecidePolicyApprovalTaskDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  reason?: string;
}
