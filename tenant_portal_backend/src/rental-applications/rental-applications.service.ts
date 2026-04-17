import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalApplicationDto } from './dto/create-rental-application.dto';
import { UpdateRentalApplicationDto } from './dto/update-rental-application.dto';
import { ReviewRentalApplicationDto } from './dto/review-rental-application.dto';

@Injectable()
export class RentalApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRentalApplicationDto, applicantId?: string) {
    this.validateCreateDto(dto);

    const acceptanceTimestamp = new Date();

    return this.prisma.rentalApplication.create({
      data: {
        applicantId,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        fullName: dto.fullName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        income: dto.income,
        previousAddress: dto.previousAddress,
        employmentStatus: dto.employments[0]?.employmentType ?? 'UNSPECIFIED',
        creditScore: dto.creditScore,
        monthlyDebt: dto.monthlyDebt,
        bankruptcyFiledYear: dto.bankruptcyFiledYear,
        rentalHistoryComments: dto.rentalHistoryComments,
        authorizeCreditCheck: dto.authorizeCreditCheck,
        authorizeBackgroundCheck: dto.authorizeBackgroundCheck,
        authorizeEmploymentVerification: dto.authorizeEmploymentVerification,
        proofOfIncomeUploaded: dto.proofOfIncomeUploaded,
        dlIdUploaded: dto.dlIdUploaded,
        ssCardUploaded: dto.ssCardUploaded ?? false,
        termsAcceptedAt: acceptanceTimestamp,
        termsVersion: dto.termsVersion ?? 'tenant-portal-v1',
        privacyAcceptedAt: acceptanceTimestamp,
        privacyVersion: dto.privacyVersion ?? 'tenant-portal-v1',
        status: ApplicationStatus.PENDING,
      },
      include: this.defaultInclude(),
    });
  }

  async findAllForApplicant(applicantId: string) {
    return this.prisma.rentalApplication.findMany({
      where: { applicantId },
      include: this.defaultInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, orgId?: string) {
    const application = await this.prisma.rentalApplication.findFirst({
      where: {
        id,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: this.defaultInclude(),
    });

    if (!application) {
      throw new NotFoundException('Rental application not found');
    }

    return application;
  }

  async update(id: number, dto: UpdateRentalApplicationDto, orgId?: string) {
    await this.findOne(id, orgId);

    const data: Prisma.RentalApplicationUpdateInput = {
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      income: dto.income,
      previousAddress: dto.previousAddress,
      creditScore: dto.creditScore,
      monthlyDebt: dto.monthlyDebt,
      bankruptcyFiledYear: dto.bankruptcyFiledYear,
      rentalHistoryComments: dto.rentalHistoryComments,
      employmentStatus: dto.employments?.[0]?.employmentType,
      authorizeCreditCheck: dto.authorizeCreditCheck,
      authorizeBackgroundCheck: dto.authorizeBackgroundCheck,
      authorizeEmploymentVerification: dto.authorizeEmploymentVerification,
      proofOfIncomeUploaded: dto.proofOfIncomeUploaded,
      dlIdUploaded: dto.dlIdUploaded,
      ssCardUploaded: dto.ssCardUploaded,
    };

    return this.prisma.rentalApplication.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async review(id: number, dto: ReviewRentalApplicationDto, reviewedById?: string, orgId?: string) {
    const application = await this.findOne(id, orgId);

    if (!this.isReviewableStatus(dto.status)) {
      throw new BadRequestException(`Unsupported review status: ${dto.status}`);
    }

    if (
      ([ApplicationStatus.REJECTED, ApplicationStatus.CONDITIONALLY_APPROVED] as ApplicationStatus[]).includes(dto.status) &&
      !dto.notes?.trim()
    ) {
      throw new BadRequestException('Review notes are required for this decision');
    }

    return this.prisma.rentalApplication.update({
      where: { id: application.id },
      data: {
        status: dto.status,
        screenedById: reviewedById,
        screenedAt: new Date(),
        decisionReasonCode: dto.reasonCode,
        decisionNotes: dto.notes?.trim() || null,
        decisionedAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  private validateCreateDto(dto: CreateRentalApplicationDto) {
    if (!dto.termsAccepted || !dto.privacyAccepted) {
      throw new BadRequestException('Terms and privacy consent are required');
    }

    if (!dto.authorizeCreditCheck || !dto.authorizeBackgroundCheck || !dto.authorizeEmploymentVerification) {
      throw new BadRequestException('Screening authorizations are required');
    }

    if (!dto.proofOfIncomeUploaded || !dto.dlIdUploaded) {
      throw new BadRequestException('Income proof and government ID are required');
    }

    if (!dto.employments.length) {
      throw new BadRequestException('At least one employment entry is required');
    }
  }

  private isReviewableStatus(status: ApplicationStatus) {
    return ([
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.APPROVED,
      ApplicationStatus.CONDITIONALLY_APPROVED,
      ApplicationStatus.REJECTED,
    ] as ApplicationStatus[]).includes(status);
  }

  // ========== GAP REMEDIATION - Issue 5: Screening Risk Reasoning ==========

  async getScreeningReasoning(applicationId: string, orgId: string) {
    // In production, this would pull actual screening data
    // For now, return stub data showing the breakdown structure
    
    return {
      applicationId,
      overallRiskScore: 72,
      riskLevel: 'HIGH',
      factors: [
        {
          category: 'credit',
          factor: 'Credit Score',
          value: 580,
          threshold: 650,
          status: 'BELOW_THRESHOLD',
          impact: 'HIGH',
          description: 'Credit score below minimum threshold of 650',
        },
        {
          category: 'eviction',
          factor: 'Eviction History',
          value: '1 prior eviction',
          threshold: '0',
          status: 'BELOW_THRESHOLD',
          impact: 'HIGH',
          description: 'One prior eviction on record',
        },
        {
          category: 'income',
          factor: 'Income Verification',
          value: 'Partially verified',
          threshold: 'Fully verified',
          status: 'PARTIAL',
          impact: 'MEDIUM',
          description: 'Income documents incomplete',
        },
        {
          category: 'references',
          factor: 'Reference Check',
          value: '2 of 3 references responded',
          threshold: '3 references',
          status: 'PARTIAL',
          impact: 'LOW',
          description: 'One reference did not respond',
        },
      ],
      recommendation: 'CONDITIONAL',
      recommendedConditions: [
        'Require co-signer',
        'Higher security deposit',
        'Additional income verification',
      ],
    };
  }

  // ========== END GAP REMEDIATION ==========

  private defaultInclude() {
    return {
      property: true,
      unit: true,
      applicant: true,
      screenedBy: true,
      manualNotes: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    };
  }
}
