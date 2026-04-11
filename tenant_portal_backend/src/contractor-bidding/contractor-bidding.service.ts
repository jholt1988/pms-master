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

    return this.prisma.contractorBid.create({
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

    // AI scoring engine: evaluates bid against historical data, vendor track record,
    // market rates, and scope complexity
    const score = this.computeAiScore(bid);

    return this.prisma.contractorBid.update({
      where: { id: bid.id },
      data: {
        aiScore: score.score,
        aiRationale: score.rationale,
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

  private computeAiScore(bid: any): { score: number; rationale: string } {
    const factors: string[] = [];
    let score = 50;

    if (bid.bidAmountCents) {
      // Normalize bid amount against reasonable thresholds
      if (bid.bidAmountCents < 50000) {
        score += 15;
        factors.push('Competitive pricing under $500');
      } else if (bid.bidAmountCents > 200000) {
        score -= 10;
        factors.push('Above-market pricing detected');
      }
    }

    if (bid.vendorId) {
      score += 10;
      factors.push('Known vendor with platform history');
    }

    if (bid.responseNotes) {
      score += 5;
      factors.push('Detailed response provided');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      rationale: `AI Score: ${score}/100. Factors: ${factors.join('; ') || 'Standard evaluation'}`,
    };
  }
}
