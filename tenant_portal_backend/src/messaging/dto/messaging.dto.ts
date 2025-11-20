import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BulkSendStrategy, LeaseStatus, Role } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @IsOptional()
  conversationId?: number;

  @IsInt()
  @IsOptional()
  recipientId?: number;
}

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  participantIds: number[];

  @IsString()
  @IsOptional()
  initialMessage?: string;
}

export class GetConversationsQueryDto {
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @IsOptional()
  limit?: number = 20;
}

export class GetMessagesQueryDto {
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @IsOptional()
  limit?: number = 50;
}

export class RecipientFilterDto {
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  propertyIds?: number[];

  @IsOptional()
  @IsArray()
  @IsEnum(LeaseStatus, { each: true })
  leaseStatuses?: LeaseStatus[];

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateBulkMessageDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsInt()
  templateId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecipientFilterDto)
  filters?: RecipientFilterDto;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  recipientIds?: number[];

  @IsOptional()
  @IsEnum(BulkSendStrategy)
  sendStrategy?: BulkSendStrategy = BulkSendStrategy.IMMEDIATE;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  throttlePerMinute?: number;

  @IsOptional()
  @IsObject()
  mergeFields?: Record<string, string>;
}
