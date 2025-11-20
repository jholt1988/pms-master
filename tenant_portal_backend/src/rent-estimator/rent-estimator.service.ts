
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RentEstimatorService {
  constructor(private prisma: PrismaService) {}

  async estimateRent(propertyId: number, unitId: number): Promise<{ estimatedRent: number; details: string }> {
    // In a real application, this would involve more sophisticated logic:
    // - Fetching comparable properties/units from the database.
    // - Using external data sources (e.g., Zillow API, local market data).
    // - Applying algorithms based on square footage, number of bedrooms/bathrooms, amenities, location, etc.

    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: { property: true },
    });

    if (!unit) {
      throw new Error('Unit not found');
    }

    // Placeholder logic: A very basic estimation based on unit size and a fixed rate
    // For demonstration, let's assume a base rate per unit and some adjustments.
    let estimatedRent = 1000; // Base rent

    if (unit.name.includes('Studio')) {
      estimatedRent += 100;
    } else if (unit.name.includes('1 Bed')) {
      estimatedRent += 200;
    } else if (unit.name.includes('2 Bed')) {
      estimatedRent += 400;
    }

    // Further adjustments could be based on property location, amenities, etc.
    // For example, if property.name includes 'Luxury', add more.
    if (unit.property.name.includes('Luxury')) {
      estimatedRent += 300;
    }

    const details = `Estimated based on unit type (${unit.name}) and property features (${unit.property.name}).`;

    return { estimatedRent, details };
  }
}
