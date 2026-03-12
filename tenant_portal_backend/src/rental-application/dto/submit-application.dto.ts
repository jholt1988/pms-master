import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';

class RentalApplicationReferenceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  yearsKnown?: string;
}

class RentalApplicationPastLandlordDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  propertyAddress?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  monthlyRent?: string;

  @IsOptional()
  @IsString()
  reasonForLeaving?: string;
}

class RentalApplicationEmploymentDto {
  @IsString()
  @IsNotEmpty()
  employerName!: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  supervisorName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsString()
  monthlyIncome?: string;
}

class RentalApplicationAdditionalIncomeDto {
  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  frequency?: string;
}

class RentalApplicationPetDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  age?: string;

  @IsBoolean()
  vaccinated = false;

  @IsBoolean()
  spayedNeutered = false;
}

class RentalApplicationVehicleDto {
  @IsString()
  @IsNotEmpty()
  make!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  registeredOwner?: string;
}

export class SubmitApplicationDto {
  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  propertyId!: string;

  @Transform(({ value }) => (value === undefined || value === null ? value : String(value)))
  @IsString()
  unitId!: string;

  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^[0-9+().\-\s]{7,20}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber!: string;

  @IsNumber()
  @Min(0)
  income!: number;

  @IsString()
  previousAddress!: string;

  @IsOptional()
  @IsNumber()
  creditScore?: number;

  @IsOptional()
  @IsNumber()
  monthlyDebt?: number;

  @IsOptional()
  @IsNumber()
  bankruptcyFiledYear?: number;

  @IsOptional()
  @IsString()
  rentalHistoryComments?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationReferenceDto)
  references: RentalApplicationReferenceDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationPastLandlordDto)
  pastLandlords: RentalApplicationPastLandlordDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationEmploymentDto)
  employments: RentalApplicationEmploymentDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationAdditionalIncomeDto)
  additionalIncomes: RentalApplicationAdditionalIncomeDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationPetDto)
  pets: RentalApplicationPetDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalApplicationVehicleDto)
  vehicles: RentalApplicationVehicleDto[] = [];

  @IsBoolean()
  authorizeCreditCheck!: boolean;

  @IsBoolean()
  authorizeBackgroundCheck!: boolean;

  @IsBoolean()
  authorizeEmploymentVerification!: boolean;

  @IsOptional()
  @IsString()
  negativeAspectsExplanation?: string;

  @Transform(({ value, obj }) => (value ?? obj?.ssnCardUploaded ?? false))
  @IsOptional()
  @IsBoolean()
  ssCardUploaded: boolean = false;

  @Transform(({ value }) => (value ?? false))
  @IsOptional()
  @IsBoolean()
  proofOfIncomeUploaded: boolean = false;

  @Transform(({ value, obj }) => (value ?? obj?.identificationUploaded ?? false))
  @IsOptional()
  @IsBoolean()
  dlIdUploaded: boolean = false;

  @IsBoolean()
  termsAccepted!: boolean;

  @IsString()
  @IsNotEmpty()
  termsVersion!: string;

  @IsBoolean()
  privacyAccepted!: boolean;

  @IsString()
  @IsNotEmpty()
  privacyVersion!: string;
}
