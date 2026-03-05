
import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RentalApplicationService } from './rental-application.service';
import { Roles } from '../auth/roles.decorator';
import { ApplicationStatus, Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { AddRentalApplicationNoteDto } from './dto/add-note.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: Role;
  };
}

@Controller('rental-applications')
export class RentalApplicationController {
  constructor(private readonly rentalApplicationService: RentalApplicationService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  submitApplication(@Body() data: SubmitApplicationDto, @Request() req: Request) {
    const authUser = (req as AuthenticatedRequest).user;
    return this.rentalApplicationService.submitApplication(data, authUser?.userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  getAllApplications(@OrgId() orgId?: string) {
    return this.rentalApplicationService.getAllApplications(orgId);
  }

  @Get('my-applications')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('TENANT')
  getMyApplications(@Request() req: AuthenticatedRequest) {
    return this.rentalApplicationService.getApplicationsByApplicantId(req.user.userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  getApplicationById(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentalApplicationService.getApplicationById(Number(id), orgId);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  updateApplicationStatus(
    @Param('id') id: string,
    @Body() data: { status: ApplicationStatus },
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.rentalApplicationService.updateApplicationStatus(
      Number(id),
      data.status,
      req.user,
      orgId,
    );
  }

  @Post(':id/screen')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  screenApplication(@Param('id') id: string, @Request() req: AuthenticatedRequest, @OrgId() orgId?: string) {
    return this.rentalApplicationService.screenApplication(Number(id), req.user, orgId);
  }

  @Post(':id/notes')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddRentalApplicationNoteDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.rentalApplicationService.addNote(Number(id), dto, {
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
    }, orgId);
  }

  @Get(':id/timeline')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'TENANT')
  getApplicationTimeline(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentalApplicationService.getApplicationTimeline(Number(id), orgId);
  }

  @Get(':id/lifecycle')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER', 'TENANT')
  getApplicationLifecycle(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentalApplicationService.getApplicationLifecycleStage(Number(id), orgId);
  }

  @Get(':id/transitions')
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  getAvailableTransitions(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.rentalApplicationService.getAvailableTransitions(
      Number(id),
      req.user.role,
      orgId,
    );
  }

  @Post(':id/ai-review')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
  @Roles('PROPERTY_MANAGER')
  getAiReview(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.rentalApplicationService.getAiReview(Number(id), orgId);
  }
}
