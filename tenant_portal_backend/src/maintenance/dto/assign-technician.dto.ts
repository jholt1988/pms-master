import { IsInt } from 'class-validator';

export class AssignTechnicianDto {
  @IsInt()
  technicianId!: number;
}
