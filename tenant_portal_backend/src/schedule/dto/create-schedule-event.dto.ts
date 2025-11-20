import { IsString, IsEnum, IsOptional, IsInt, IsDateString } from 'class-validator';

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
  @IsEnum(EventType)
  type!: EventType;

  @IsString()
  title!: string;

  @IsDateString()
  date!: string;

  @IsEnum(EventPriority)
  priority!: EventPriority;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsInt()
  unitId?: number;

  @IsOptional()
  @IsInt()
  tenantId?: number;
}
