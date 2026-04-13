import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RentalApplicationEmploymentDto {
  @IsString()
  employer!: string;

  @IsString()
  role!: string;

  @IsNumber()
  @Min(0)
  monthlyIncome!: number;

  @IsOptional()
  @IsString()
  employmentType?: string;
}

class RentalApplicationOccupantDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}

export class CreateRentalApplicationDto {
  @IsUUID()
  propertyId!: string;

  @IsUUID()
  unitId!: string;

  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsPhoneNumber('US')
  phoneNumber!: string;

  @IsNumber()
  @Min(0)
  income!: number;

  @IsString()
  previousAddress!: string;

  @IsOptional()
  @IsInt()
  @Min(300)
  creditScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyDebt?: number;

  @IsOptional()
  @IsInt()
  bankruptcyFiledYear?: number;

  @IsOptional()
  @IsString()
  rentalHistoryComments?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationEmploymentDto)
  employments: RentalApplicationEmploymentDto[] = [];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationOccupantDto)
  occupants?: RentalApplicationOccupantDto[];

  @IsBoolean()
  authorizeCreditCheck!: boolean;

  @IsBoolean()
  authorizeBackgroundCheck!: boolean;

  @IsBoolean()
  authorizeEmploymentVerification!: boolean;

  @IsBoolean()
  proofOfIncomeUploaded!: boolean;

  @IsBoolean()
  dlIdUploaded!: boolean;

  @IsOptional()
  @IsBoolean()
  ssCardUploaded?: boolean;

  @IsBoolean()
  termsAccepted!: boolean;

  @IsBoolean()
  privacyAccepted!: boolean;

  @IsOptional()
  @IsString()
  termsVersion?: string;

  @IsOptional()
  @IsString()
  privacyVersion?: string;
}
