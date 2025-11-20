import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
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
  @IsPhoneNumber('US')
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
