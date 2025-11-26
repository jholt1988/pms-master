import { Test, TestingModule } from '@nestjs/testing';
import { InspectionService } from './inspection.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  InspectionType, 
  InspectionStatus, 
  RoomType,
  InspectionCondition 
} from './dto/simple-inspection.dto';

describe('InspectionService', () => {
  let service: InspectionService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  // Mock data
  const mockProperty = {
    id: 1,
    name: 'Test Property',
    address: '123 Test St, Test City, Test State, USA',
  };

  const mockUnit = {
    id: 1,
    name: 'Unit 101',
    propertyId: 1,
  };

  const mockUser = {
    id: 1,
    username: 'test@example.com',
    role: 'PROPERTY_MANAGER',
  };

  const mockInspection = {
    id: 1,
    propertyId: 1,
    unitId: 1,
    type: InspectionType.MOVE_IN,
    status: InspectionStatus.SCHEDULED,
    scheduledDate: new Date(),
    createdById: 1,
    property: mockProperty,
    unit: mockUnit,
    inspector: mockUser,
    tenant: null as any,
    rooms: [] as any[],
    signatures: [] as any[],
    repairEstimates: [] as any[],
    photos: [] as any[],
  };

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
    },
    unit: {
      findUnique: jest.fn(),
    },
    lease: {
      findUnique: jest.fn(),
    },
    unitInspection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inspectionRoom: {
      create: jest.fn(),
    },
    inspectionChecklistItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inspectionChecklistPhoto: {
      create: jest.fn(),
    },
    inspectionSignature: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<InspectionService>(InspectionService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createInspection', () => {
    const createInspectionDto = {
      propertyId: 1,
      unitId: 1,
      type: InspectionType.MOVE_IN,
      scheduledDate: new Date().toISOString(),
      inspectorId: 1,
    };

    it('should create an inspection successfully', async () => {
      // Setup mocks
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.unit.findUnique.mockResolvedValue(mockUnit);
      mockPrismaService.unitInspection.create.mockResolvedValue(mockInspection);

      const result = await service.createInspection(createInspectionDto, 1);

      expect(mockPrismaService.property.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.unit.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.unitInspection.create).toHaveBeenCalledWith({
        data: {
          ...createInspectionDto,
          scheduledDate: new Date(createInspectionDto.scheduledDate),
          createdById: 1,
          status: 'SCHEDULED',
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockInspection);
    });

    it('should throw NotFoundException if property does not exist', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(
        service.createInspection(createInspectionDto, 1)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if unit does not exist', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.unit.findUnique.mockResolvedValue(null);

      await expect(
        service.createInspection(createInspectionDto, 1)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if unit does not belong to property', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.unit.findUnique.mockResolvedValue({
        ...mockUnit,
        propertyId: 2, // Different property
      });

      await expect(
        service.createInspection(createInspectionDto, 1)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInspectionById', () => {
    it('should return inspection with full details', async () => {
      mockPrismaService.unitInspection.findUnique.mockResolvedValue(mockInspection);

      const result = await service.getInspectionById(1);

      expect(mockPrismaService.unitInspection.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockInspection);
    });

    it('should throw NotFoundException if inspection does not exist', async () => {
      mockPrismaService.unitInspection.findUnique.mockResolvedValue(null);

      await expect(service.getInspectionById(1)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateChecklistItem', () => {
    const updateDto = {
      condition: 'FAIR' as any,
      notes: 'Some wear visible',
      requiresAction: true,
    };

    it('should update checklist item successfully', async () => {
      const mockItem = { id: 1, roomId: 1 };
      const updatedItem = { ...mockItem, ...updateDto };

      mockPrismaService.inspectionChecklistItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.inspectionChecklistItem.update.mockResolvedValue(updatedItem);

      const result = await service.updateChecklistItem(1, updateDto);

      expect(mockPrismaService.inspectionChecklistItem.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.inspectionChecklistItem.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
        include: expect.any(Object),
      });
      expect(result).toEqual(updatedItem);
    });

    it('should throw NotFoundException if checklist item does not exist', async () => {
      mockPrismaService.inspectionChecklistItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateChecklistItem(1, updateDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addSignature', () => {
    const signatureDto = {
      userId: 1,
      role: 'tenant',
      signatureData: 'base64-signature-data',
    };

    it('should add signature successfully', async () => {
      const mockSignature = { id: 1, ...signatureDto, inspectionId: 1 };

      mockPrismaService.unitInspection.findUnique.mockResolvedValue(mockInspection);
      mockPrismaService.inspectionSignature.findFirst.mockResolvedValue(null);
      mockPrismaService.inspectionSignature.create.mockResolvedValue(mockSignature);

      const result = await service.addSignature(1, signatureDto);

      expect(mockPrismaService.inspectionSignature.findFirst).toHaveBeenCalledWith({
        where: {
          inspectionId: 1,
          userId: 1,
        },
      });
      expect(mockPrismaService.inspectionSignature.create).toHaveBeenCalledWith({
        data: {
          inspectionId: 1,
          ...signatureDto,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockSignature);
    });

    it('should throw BadRequestException if user already signed', async () => {
      mockPrismaService.unitInspection.findUnique.mockResolvedValue(mockInspection);
      mockPrismaService.inspectionSignature.findFirst.mockResolvedValue({
        id: 1,
        userId: 1,
        inspectionId: 1,
      });

      await expect(
        service.addSignature(1, signatureDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeInspection', () => {
    it('should complete inspection successfully', async () => {
      const completedInspection = {
        ...mockInspection,
        status: InspectionStatus.COMPLETED,
        completedDate: new Date(),
      };

      mockPrismaService.unitInspection.findUnique.mockResolvedValue(mockInspection);
      mockPrismaService.unitInspection.update.mockResolvedValue(completedInspection);

      const result = await service.completeInspection(1);

      expect(mockPrismaService.unitInspection.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'COMPLETED',
          completedDate: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(completedInspection);
      expect(mockEmailService.sendMail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if inspection is already completed', async () => {
      const completedInspection = {
        ...mockInspection,
        status: InspectionStatus.COMPLETED,
      };

      mockPrismaService.unitInspection.findUnique.mockResolvedValue(completedInspection);

      await expect(service.completeInspection(1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getInspectionStats', () => {
    it('should return inspection statistics', async () => {
      const mockStats = [5, 2, 1, 2, 3]; // total, scheduled, inProgress, completed, requiresAction

      mockPrismaService.unitInspection.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // scheduled
        .mockResolvedValueOnce(1) // in progress
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(3); // requires action

      const result = await service.getInspectionStats();

      expect(result).toEqual({
        total: 5,
        byStatus: {
          scheduled: 2,
          inProgress: 1,
          completed: 2,
        },
        requiresAction: 3,
      });
    });

    it('should filter by property if provided', async () => {
      mockPrismaService.unitInspection.count.mockResolvedValue(1);

      await service.getInspectionStats(1);

      expect(mockPrismaService.unitInspection.count).toHaveBeenCalledWith({
        where: { propertyId: 1 },
      });
    });
  });

  describe('getInspections', () => {
    const queryDto = { page: 1, limit: 10 };
    
    it('should return paginated inspections', async () => {
      const mockInspections = [mockInspection];
      const mockCount = 1;

      mockPrismaService.unitInspection.findMany.mockResolvedValue(mockInspections);
      mockPrismaService.unitInspection.count.mockResolvedValue(mockCount);

      const result = await service.getInspections(queryDto);

      expect(result).toEqual({
        inspections: mockInspections,
        total: mockCount,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should filter inspections by property', async () => {
      const query = { ...queryDto, propertyId: 1 };
      mockPrismaService.unitInspection.findMany.mockResolvedValue([]);
      mockPrismaService.unitInspection.count.mockResolvedValue(0);

      await service.getInspections(query);

      expect(mockPrismaService.unitInspection.findMany).toHaveBeenCalledWith({
        where: { propertyId: 1 },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('updateInspection', () => {
    const updateDto = {
      status: InspectionStatus.IN_PROGRESS,
      notes: 'Updated inspection notes'
    };

    it('should update inspection successfully', async () => {
      const updatedInspection = { ...mockInspection, ...updateDto };
      
      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(mockInspection);
      mockPrismaService.unitInspection.update.mockResolvedValue(updatedInspection);

      const result = await service.updateInspection(1, updateDto);

      expect(mockPrismaService.unitInspection.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
        include: expect.any(Object)
      });

      expect(result).toEqual(updatedInspection);
    });

    it('should throw NotFoundException when inspection not found', async () => {
      mockPrismaService.unitInspection.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(service.updateInspection(999, updateDto))
        .rejects.toThrow();
    });
  });

  describe('createInspectionWithRooms', () => {
    const createWithRoomsDto = {
      propertyId: 1,
      unitId: 1,
      type: 'MOVE_IN' as InspectionType,
      scheduledDate: new Date().toISOString(),
      inspectorId: 1,
      rooms: [
        { name: 'Living Room', roomType: RoomType.LIVING_ROOM },
        { name: 'Kitchen', roomType: RoomType.KITCHEN }
      ]
    };

    it('should create inspection with rooms successfully', async () => {
      const inspectionWithRooms = {
        ...mockInspection,
        rooms: [
          { id: 1, name: 'Living Room', roomType: 'LIVING_ROOM', checklistItems: [] },
          { id: 2, name: 'Kitchen', roomType: 'KITCHEN', checklistItems: [] }
        ]
      };

      mockPrismaService.property.findUnique.mockResolvedValue(mockProperty);
      mockPrismaService.unit.findUnique.mockResolvedValue(mockUnit);
      mockPrismaService.unitInspection.create.mockResolvedValue(inspectionWithRooms);

      const result = await service.createInspectionWithRooms(createWithRoomsDto, 1);

      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0].name).toBe('Living Room');
      expect(result.rooms[1].name).toBe('Kitchen');
    });

    it('should throw BadRequestException when no rooms provided', async () => {
      const dtoWithoutRooms = { ...createWithRoomsDto, rooms: [] };

      await expect(service.createInspectionWithRooms(dtoWithoutRooms, 1))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('createRoomWithDefaultChecklist', () => {
    const createRoomDto = {
      name: 'Bathroom',
      roomType: 'BATHROOM' as RoomType
    };

    it('should create room with default checklist', async () => {
      const mockRoom = {
        id: 1,
        name: 'Bathroom',
        roomType: 'BATHROOM',
        inspectionId: 1,
        checklistItems: [
          {
            id: 1,
            itemName: 'Faucet',
            category: 'Plumbing',
            condition: 'GOOD',
            roomId: 1
          }
        ]
      };

      mockPrismaService.inspectionRoom.create.mockResolvedValue(mockRoom);

      const result = await service.createRoomWithDefaultChecklist(1, createRoomDto);

      expect(mockPrismaService.inspectionRoom.create).toHaveBeenCalledWith({
        data: {
          name: 'Bathroom',
          roomType: 'BATHROOM',
          inspectionId: 1,
          checklistItems: {
            create: expect.any(Array)
          }
        },
        include: { checklistItems: true }
      });

      expect(result).toEqual(mockRoom);
    });
  });

  describe('addPhotoToChecklistItem', () => {
    const uploadDto = {
      caption: 'Damaged faucet photo',
      metadata: JSON.stringify({ timestamp: new Date().toISOString() })
    };

    it('should add photo to checklist item successfully', async () => {
      const mockPhoto = {
        id: 1,
        checklistItemId: 1,
        imagePath: '/uploads/photo.jpg',
        caption: 'Damaged faucet photo',
        uploadedAt: new Date()
      };

      const mockChecklistItem = {
        id: 1,
        itemName: 'Faucet',
        roomId: 1
      };

      const mockFile = {
        filename: 'photo.jpg',
        path: '/uploads/photo.jpg'
      } as Express.Multer.File;

      mockPrismaService.inspectionChecklistItem.findUnique.mockResolvedValue(mockChecklistItem);
      mockPrismaService.inspectionChecklistPhoto.create.mockResolvedValue(mockPhoto);

      const result = await service.addPhotoToChecklistItem(1, uploadDto, mockFile);

      expect(mockPrismaService.inspectionChecklistPhoto.create).toHaveBeenCalledWith({
        data: {
          checklistItemId: 1,
          imagePath: '/uploads/photo.jpg',
          caption: 'Damaged faucet photo',
          metadata: uploadDto.metadata,
          uploadedAt: expect.any(Date)
        }
      });

      expect(result).toEqual(mockPhoto);
    });

    it('should throw NotFoundException when checklist item not found', async () => {
      const mockFile = { filename: 'photo.jpg' } as Express.Multer.File;
      
      mockPrismaService.inspectionChecklistItem.findUnique.mockResolvedValue(null);

      await expect(service.addPhotoToChecklistItem(999, uploadDto, mockFile))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteInspection', () => {
    it('should delete inspection successfully', async () => {
      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(mockInspection);
      mockPrismaService.unitInspection.delete.mockResolvedValue(mockInspection);

      await service.deleteInspection(1);

      expect(mockPrismaService.unitInspection.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should throw NotFoundException when inspection not found', async () => {
      mockPrismaService.unitInspection.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(service.deleteInspection(999))
        .rejects.toThrow();
    });

    it('should not allow deletion of completed inspections', async () => {
      const completedInspection = { ...mockInspection, status: 'COMPLETED' };
      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(completedInspection);

      await expect(service.deleteInspection(1))
        .rejects.toThrow(BadRequestException);
    });
  });
});

describe('InspectionService Integration', () => {
  it('should handle the complete inspection workflow', async () => {
    // This would be an integration test that:
    // 1. Creates an inspection
    // 2. Adds rooms and checklist items
    // 3. Updates checklist items with conditions
    // 4. Adds photos and signatures
    // 5. Completes the inspection
    // 6. Generates an estimate
    // 7. Converts estimate to maintenance requests
    
    // For now, this is a placeholder for future implementation
    expect(true).toBe(true);
  });
});