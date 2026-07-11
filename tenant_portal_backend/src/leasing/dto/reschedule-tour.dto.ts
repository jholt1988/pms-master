import { IsDateString, IsString, MinLength } from 'class-validator';

/** Body for PATCH /tours/:id/reschedule. */
export class RescheduleTourDto {
  @IsDateString()
  scheduledDate!: string;

  @IsString()
  @MinLength(1)
  scheduledTime!: string;
}
