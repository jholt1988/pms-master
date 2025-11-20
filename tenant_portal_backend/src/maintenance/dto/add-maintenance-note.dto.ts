import { IsString, MaxLength } from 'class-validator';

export class AddMaintenanceNoteDto {
  @IsString()
  @MaxLength(1000)
  body!: string;
}
