import { PartialType } from '@nestjs/swagger';
import { CreateRentalApplicationDto } from './create-rental-application.dto';

export class UpdateRentalApplicationDto extends PartialType(CreateRentalApplicationDto) {}
