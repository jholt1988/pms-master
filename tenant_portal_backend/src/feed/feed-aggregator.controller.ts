import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MockAuthGuard } from '../auth/mock-auth.guard';

@Controller('api/v2/feed')
@UseGuards(MockAuthGuard)
export class FeedController {
  constructor(private prisma: PrismaService) {}

  @Get()
  // @UseGuards(JwtAuthGuard)
  async getFeed(@Req() req, @Query('limit') limit = 20) {
    const userRole = req.user.role; // e.g., 'property_manager'

    return this.prisma.feedItem.findMany({
      where: {
        roleAccess: { has: userRole },
        isDismissed: false,
      },
      orderBy: { priorityScore: 'desc' },
      take: Number(limit),
    });
  }
}