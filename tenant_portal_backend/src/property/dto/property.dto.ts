import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type, Transform, TransformFnParams } from 'class-transformer';
import { PropertyAvailabilityStatus } from '@prisma/client';

const transformCsvToArray = ({ value }: TransformFnParams) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== undefined && entry !== null && String(entry).trim().length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return undefined;
};

const transformToNumber = ({ value }: TransformFnParams) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxRent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  yearBuilt?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;
}

export class PropertyPhotoDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class PropertyAmenityDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  value?: string;
}

export class UpdatePropertyMarketingDto {
  @IsOptional()
  @IsNumber()
  minRent?: number;

  @IsOptional()
  @IsNumber()
  maxRent?: number;

  @IsOptional()
  @IsEnum(PropertyAvailabilityStatus)
  availabilityStatus?: PropertyAvailabilityStatus;

  @IsOptional()
  @IsString()
  availableOn?: string;

  @IsOptional()
  @IsString()
  marketingHeadline?: string;

  @IsOptional()
  @IsString()
  marketingDescription?: string;

  @IsOptional()
  @IsBoolean()
  isSyndicationEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyPhotoDto)
  photos?: PropertyPhotoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyAmenityDto)
  amenities?: PropertyAmenityDto[];
}

export type PropertySortOption = 'newest' | 'price' | 'bedrooms' | 'bathrooms';

export class PropertySearchQueryDto {
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @Transform(transformCsvToArray)
  @IsString({ each: true })
  cities?: string[];

  @IsOptional()
  @Transform(transformCsvToArray)
  @IsString({ each: true })
  states?: string[];

  @IsOptional()
  @Transform(transformCsvToArray)
  @IsString({ each: true })
  propertyTypes?: string[];

  @IsOptional()
  @Transform(transformCsvToArray)
  @IsEnum(PropertyAvailabilityStatus, { each: true })
  availabilityStatuses?: PropertyAvailabilityStatus[];

  @IsOptional()
  @Transform(transformCsvToArray)
  @IsString({ each: true })
  amenityKeys?: string[];

  @IsOptional()
  @Transform(transformCsvToArray)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(transformToNumber)
  @IsNumber()
  minRent?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsNumber()
  maxRent?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsNumber()
  bedroomsMin?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsNumber()
  bedroomsMax?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsNumber()
  bathroomsMin?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsNumber()
  bathroomsMax?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(transformToNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(['newest', 'price', 'bedrooms', 'bathrooms'])
  sortBy?: PropertySortOption;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class SavePropertyFilterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => PropertySearchQueryDto)
  filters: PropertySearchQueryDto;
}
