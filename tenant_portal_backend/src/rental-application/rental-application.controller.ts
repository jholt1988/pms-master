
import { Controller, Get, Post, Body, UseGuards, Request, Param, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RentalApplicationService } from './rental-application.service';
import { Roles } from '../auth/roles.decorator';
import { Role, ApplicationStatus } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { AddRentalApplicationNoteDto } from './dto/add-note.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    username: string;
    role: Role;
  };
}

@Controller('rental-applications')
export class RentalApplicationController {
  constructor(private readonly rentalApplicationService: RentalApplicationService) {}

  @Post()
  submitApplication(@Body() data: SubmitApplicationDto, @Request() req: Request) {
    const authUser = (req as AuthenticatedRequest).user;
    return this.rentalApplicationService.submitApplication(data, authUser?.userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getAllApplications() {
    return this.rentalApplicationService.getAllApplications();
  }

  @Get('my-applications')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT)
  getMyApplications(@Request() req: AuthenticatedRequest) {
    return this.rentalApplicationService.getApplicationsByApplicantId(req.user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROPERTY_MANAGER)
  getApplicationById(@Param('id') id: string) {
    return this.rentalApplicationService.getApplicationById(Number(id));
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROPERTY_MANAGER)
  updateApplicationStatus(@Param('id') id: string, @Body() data: { status: ApplicationStatus }) {
    return this.rentalApplicationService.updateApplicationStatus(Number(id), data.status);
  }

  @Post(':id/screen')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROPERTY_MANAGER)
  screenApplication(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.rentalApplicationService.screenApplication(Number(id), req.user);
  }

  @Post(':id/notes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROPERTY_MANAGER)
  addNote(
    @Param('id') id: string,
    @Body() dto: AddRentalApplicationNoteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.rentalApplicationService.addNote(Number(id), dto, {
      userId: req.user.userId,
      username: req.user.username,
    });
  }
}
