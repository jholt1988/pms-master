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
  IsUUID,
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

  @IsUUID()
  @IsOptional()
  recipientId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

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
  @IsUUID('4', { each: true })
  propertyIds?: string[];

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
  @IsUUID('4', { each: true })
  recipientIds?: string[];

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
