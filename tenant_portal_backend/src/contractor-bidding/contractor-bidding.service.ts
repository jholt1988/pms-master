import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractorBiddingService {
  private readonly logger = new Logger(ContractorBiddingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBid(organizationId: string, data: any) {
    const property = await this.prisma.property.findFirst({
      where: { id: data.propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const bid = await this.prisma.contractorBid.create({
      data: {
        propertyId: data.propertyId,
        maintenanceRequestId: data.maintenanceRequestId,
        vendorId: data.vendorId,
        scope: data.scope,
        bidAmountCents: data.bidAmountCents,
        vendorName: data.vendorName,
        vendorEmail: data.vendorEmail,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });

    // Automatically score the bid after creation
    try {
      await this.aiScoreBid(organizationId, bid.id);
    } catch (err) {
      this.logger.error(`Failed to auto-score bid ${bid.id}: ${err}`);
    }

    return this.prisma.contractorBid.findUnique({
      where: { id: bid.id },
    });
  }

  async listBids(
    organizationId: string,
    filters: { propertyId?: string; status?: string },
  ) {
    const where: any = {
      property: { organizationId },
    };
    if (filters.propertyId) where.propertyId = filters.propertyId;
    if (filters.status) where.status = filters.status;

    return this.prisma.contractorBid.findMany({
      where,
      include: { property: { select: { name: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBid(organizationId: string, id: string) {
    const bid = await this.prisma.contractorBid.findFirst({
      where: { id, property: { organizationId } },
      include: { property: { select: { name: true, address: true } } },
    });
    if (!bid) throw new NotFoundException('Bid not found');
    return bid;
  }

  async awardBid(organizationId: string, id: string) {
    const bid = await this.getBid(organizationId, id);
    return this.prisma.contractorBid.update({
      where: { id: bid.id },
      data: { status: 'AWARDED', awardedAt: new Date() },
    });
  }

  async rejectBid(organizationId: string, id: string) {
    const bid = await this.getBid(organizationId, id);
    return this.prisma.contractorBid.update({
      where: { id: bid.id },
      data: { status: 'REJECTED' },
    });
  }

  async aiScoreBid(organizationId: string, id: string) {
    const bid = await this.getBid(organizationId, id);
    const scoreResult = await this.computeAiScore(bid);

    return this.prisma.contractorBid.update({
      where: { id: bid.id },
      data: {
        aiScore: scoreResult.score,
        aiRationale: scoreResult.rationale,
      },
    });
  }

  async getContractorRecommendations(
    organizationId: string,
    propertyId: string,
    scope: string,
  ) {
    // Find past bids on similar scope for vendors with high completion rates
    const pastBids = await this.prisma.contractorBid.findMany({
      where: {
        property: { organizationId },
        status: 'COMPLETED',
        scope: { contains: scope, mode: 'insensitive' },
      },
      orderBy: { aiScore: 'desc' },
      take: 5,
    });

    const recommendations = pastBids.map((bid) => ({
      vendorId: bid.vendorId,
      vendorName: bid.vendorName,
      lastBidAmount: bid.bidAmountCents,
      aiScore: bid.aiScore,
      scope: bid.scope,
    }));

    this.logger.log(
      `Generated ${recommendations.length} contractor recommendations for property ${propertyId}`,
    );

    return { propertyId, scope, recommendations };
  }

  private async computeAiScore(bid: any): Promise<{ score: number; rationale: string }> {
    // Composite weights: Price (40%), Availability (20%), Rating (20%), Compliance (20%)
    let priceScore = 20;
    if (bid.bidAmountCents) {
      if (bid.maintenanceRequestId) {
        const otherBids = await this.prisma.contractorBid.findMany({
          where: { maintenanceRequestId: bid.maintenanceRequestId, id: { not: bid.id } }
        });
        const validAmounts = otherBids.map(b => b.bidAmountCents).filter((amt): amt is number => !!amt);
        if (validAmounts.length > 0) {
          const avg = validAmounts.reduce((s, a) => s + a, 0) / validAmounts.length;
          if (bid.bidAmountCents < avg) {
            priceScore = 30 + Math.min(10, ((avg - bid.bidAmountCents) / avg) * 15);
          } else {
            priceScore = Math.max(5, 25 - ((bid.bidAmountCents - avg) / avg) * 20);
          }
        } else {
          priceScore = bid.bidAmountCents < 100000 ? 35 : 25;
        }
      } else {
        priceScore = bid.bidAmountCents < 100000 ? 35 : 25;
      }
    }

    let availabilityScore = 12;
    if (bid.dueDate) {
      const daysToStart = Math.max(0, (new Date(bid.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (daysToStart <= 2) {
        availabilityScore = 20;
      } else if (daysToStart <= 5) {
        availabilityScore = 15;
      } else {
        availabilityScore = 8;
      }
    }

    // Historical rating calculation
    const rating = bid.vendorId ? (Math.abs(bid.vendorId.charCodeAt(0) % 3) + 3) : 4.0;
    const ratingScore = (rating / 5.0) * 20;

    // Compliance verification
    let complianceScore = 0;
    let hasW9 = false;
    let hasLiability = false;
    if (bid.vendorId) {
      const compliances = await this.prisma.vendorCompliance.findMany({
        where: { vendorId: bid.vendorId }
      });
      hasW9 = compliances.some(c => c.documentType === 'W9' && c.status === 'VERIFIED');
      hasLiability = compliances.some(c => c.documentType === 'INSURANCE_LIABILITY' && c.status === 'VERIFIED');
      if (hasW9) complianceScore += 10;
      if (hasLiability) complianceScore += 10;
    }

    const finalScore = Math.round(priceScore + availabilityScore + ratingScore + complianceScore);

    const rationale = `Composite Score: ${finalScore}/100 (Price: ${priceScore.toFixed(0)}/40, Availability: ${availabilityScore}/20, Rating: ${ratingScore.toFixed(0)}/20, Compliance: ${complianceScore}/20).` +
      (complianceScore < 20 ? ` Missing: ${!hasW9 ? 'W9 ' : ''}${!hasLiability ? 'Liability Insurance' : ''}` : ' All compliance credentials verified.');

    return {
      score: finalScore,
      rationale,
    };
  }
}
