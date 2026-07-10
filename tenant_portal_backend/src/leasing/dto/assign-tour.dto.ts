import { IsUUID } from 'class-validator';

/** Body for PATCH /tours/:id/assign. */
export class AssignTourDto {
  @IsUUID()
  userId!: string;
}
