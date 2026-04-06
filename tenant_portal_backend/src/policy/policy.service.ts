import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyBundle, PolicyBundleSchema } from './policy.types';

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveBundle(propertyId: string): Promise<PolicyBundle> {
    const record = await this.prisma.policyBundle.findFirst({
      where: { propertyId, isActive: true },
      orderBy: [{ activatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!record) {
      throw new NotFoundException('Active policy bundle not found');
    }

    return PolicyBundleSchema.parse(record.bundleJson);
  }

  async upsertBundle(propertyId: string, bundle: PolicyBundle) {
    const parsed = PolicyBundleSchema.parse(bundle);

    await this.prisma.policyBundle.updateMany({
      where: { propertyId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.policyBundle.create({
      data: {
        propertyId,
        version: parsed.version,
        bundleJson: parsed as unknown as object,
        isActive: true,
        activatedAt: new Date(),
      },
    });
  }
}

