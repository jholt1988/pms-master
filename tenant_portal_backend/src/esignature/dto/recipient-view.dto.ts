import { IsString } from 'class-validator';

export class RecipientViewDto {
  @IsString()
  returnUrl!: string;
}
