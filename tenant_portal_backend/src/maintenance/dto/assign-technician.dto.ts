import { IsInt, IsOptional } from 'class-validator';

export class AssignTechnicianDto {
  @IsInt()
  @IsOptional()
  technicianId?: number;
}
