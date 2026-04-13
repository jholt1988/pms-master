import { Test } from '@nestjs/testing';
import { ApplicationStatus } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RentalApplicationsService } from './rental-applications.service';

describe('RentalApplicationsService', () => {
  const prisma = {
    rentalApplication: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: RentalApplicationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        RentalApplicationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RentalApplicationsService);
  });

  it('creates a rental application with required consent fields', async () => {
    prisma.rentalApplication.create.mockResolvedValue({ id: 41, status: ApplicationStatus.PENDING });

    const result = await service.create({
      propertyId: '11111111-1111-1111-1111-111111111111',
      unitId: '22222222-2222-2222-2222-222222222222',
      fullName: 'Taylor Resident',
      email: 'taylor@example.com',
      phoneNumber: '+14155550123',
      income: 7200,
      previousAddress: '123 Previous St',
      employments: [{ employer: 'Acme', role: 'Manager', monthlyIncome: 7200, employmentType: 'FULL_TIME' }],
      authorizeCreditCheck: true,
      authorizeBackgroundCheck: true,
      authorizeEmploymentVerification: true,
      proofOfIncomeUploaded: true,
      dlIdUploaded: true,
      termsAccepted: true,
      privacyAccepted: true,
    });

    expect(result).toEqual({ id: 41, status: ApplicationStatus.PENDING });
    expect(prisma.rentalApplication.create).toHaveBeenCalled();
  });

  it('rejects create when employments are missing', async () => {
    await expect(
      service.create({
        propertyId: '11111111-1111-1111-1111-111111111111',
        unitId: '22222222-2222-2222-2222-222222222222',
        fullName: 'Taylor Resident',
        email: 'taylor@example.com',
        phoneNumber: '+14155550123',
        income: 7200,
        previousAddress: '123 Previous St',
        employments: [],
        authorizeCreditCheck: true,
        authorizeBackgroundCheck: true,
        authorizeEmploymentVerification: true,
        proofOfIncomeUploaded: true,
        dlIdUploaded: true,
        termsAccepted: true,
        privacyAccepted: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found for missing application', async () => {
    prisma.rentalApplication.findFirst.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records review decisions', async () => {
    prisma.rentalApplication.findFirst.mockResolvedValue({ id: 41, status: ApplicationStatus.PENDING });
    prisma.rentalApplication.update.mockResolvedValue({ id: 41, status: ApplicationStatus.APPROVED });

    const result = await service.review(
      41,
      {
        status: ApplicationStatus.APPROVED,
        notes: 'Income verified',
      },
      'reviewer-1',
    );

    expect(result).toEqual({ id: 41, status: ApplicationStatus.APPROVED });
    expect(prisma.rentalApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 41 },
        data: expect.objectContaining({
          status: ApplicationStatus.APPROVED,
          screenedById: 'reviewer-1',
          decisionNotes: 'Income verified',
        }),
      }),
    );
  });
});
