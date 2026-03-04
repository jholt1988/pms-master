import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { IsEnumSafe } from '../../common/validation/is-enum-safe.decorator';

export enum EventType {
  TOUR = 'TOUR',
  MOVE_IN = 'MOVE_IN',
  MOVE_OUT = 'MOVE_OUT',
  LEASE_EXPIRATION = 'LEASE_EXPIRATION',
  LEASE_RENEWAL = 'LEASE_RENEWAL',
  INSPECTION = 'INSPECTION',
  MAINTENANCE = 'MAINTENANCE',
}

export enum EventPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateScheduleEventDto {
  @IsEnumSafe(EventType)
  type!: EventType;

  @IsString()
  title!: string;

  @IsDateString()
  date!: string;

  @IsEnumSafe(EventPriority)
  priority!: EventPriority;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
