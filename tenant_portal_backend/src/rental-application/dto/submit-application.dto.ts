import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitApplicationDto {
  @IsNumber()
  propertyId!: number;

  @IsNumber()
  unitId!: number;

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
  employmentStatus!: string;

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
}
