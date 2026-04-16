import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyBundle, PolicyBundleSchema } from './policy.types';

// Section keys that can be updated independently
export type PolicySection = 
  | 'underwriting'
  | 'paymentPlan'
  | 'maintenanceTaxonomy'
  | 'afterHoursDispatch'
  | 'denialCompliance';

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

  async updateSection(propertyId: string, section: PolicySection, data: unknown) {
    // Get existing bundle
    const existingBundle = await this.getActiveBundle(propertyId);

    // Merge the section data
    const updatedBundle: PolicyBundle = {
      ...existingBundle,
      [section]: data,
    };

    // Upsert the updated bundle
    return this.upsertBundle(propertyId, updatedBundle);
  }
}

