import { IsString, MaxLength } from 'class-validator';

export class AddRentalApplicationNoteDto {
  @IsString()
  @MaxLength(1000)
  body!: string;
}
