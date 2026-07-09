import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseStatus, DepositDisposition, LeaseTerminationParty, BillingAlignment } from '@prisma/client';

export class LeaseTenantRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  email?: string;
}

export class LeasePropertyRefDto {
  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiProperty()
  name!: string;
}

export class LeaseUnitRefDto {
  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: LeasePropertyRefDto, nullable: true })
  property?: LeasePropertyRefDto | null;
}

/**
 * Canonical Lease response shape.
 *
 * Mirrors the backend `Lease` entity (tenant_portal_backend/prisma/schema.prisma).
 * Once this is published in the OpenAPI spec, the web clients should draw their
 * `Lease` type from the generated `components['schemas']['LeaseResponseDto']`
 * (via @propertyos/api-contracts) instead of hand-maintaining interfaces.
 * NOTE: `id` is a UUID string.
 */
export class LeaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: LeaseStatus })
  status!: LeaseStatus;

  @ApiProperty({ format: 'date-time' })
  startDate!: string;

  @ApiProperty({ format: 'date-time' })
  endDate!: string;

  @ApiProperty()
  rentAmount!: number;

  @ApiProperty()
  depositAmount!: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  depositHeldAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  depositReturnedAt?: string | null;

  @ApiPropertyOptional({ enum: DepositDisposition, nullable: true })
  depositDisposition?: DepositDisposition | null;

  @ApiPropertyOptional({ nullable: true })
  noticePeriodDays?: number | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  moveInAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  moveOutAt?: string | null;

  @ApiPropertyOptional()
  autoRenew?: boolean;

  @ApiPropertyOptional({ nullable: true })
  autoRenewLeadDays?: number | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  renewalDueAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  renewalAcceptedAt?: string | null;

  @ApiPropertyOptional({ enum: LeaseTerminationParty, nullable: true })
  terminationRequestedBy?: LeaseTerminationParty | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  terminationEffectiveAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  terminationReason?: string | null;

  @ApiPropertyOptional({ enum: BillingAlignment })
  billingAlignment?: BillingAlignment;

  @ApiPropertyOptional({ nullable: true })
  currentBalance?: number | null;

  @ApiPropertyOptional({ type: LeaseTenantRefDto })
  tenant?: LeaseTenantRefDto;

  @ApiProperty({ type: LeaseUnitRefDto })
  unit!: LeaseUnitRefDto;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string;
}
