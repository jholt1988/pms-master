import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, Delete, Query, ParseIntPipe, Patch } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeedAggregatorService } from './feed-aggregator.service';
import {AuthGuard} from '@nestjs/passport';
import {RolesGuard} from '../auth/roles.guard';
import {Roles} from '../auth/roles.decorator';
import { OrgContextGuard } from 'src/common/org-context/org-context.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('feed')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class FeedController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly feedService: FeedAggregatorService,
        private readonly eventEmitter: EventEmitter2
    ) {}

    @Get()
    async getFeed(@Request() req, @Query('limit') limit = 20) {
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

    @Patch(':id/notes')
    async updateItemNotes(
        @Param('id') id: string,
        @Body() dto:{narrative:string},
        @Request() req: any
    ) {
        const updatedItem = await this.feedService.addNoteToItem(id,{
            narrative:dto.narrative,
            userId:req.user.userId,
            lastUpdated: new Date().toISOString()
        });

        this.eventEmitter.emit('feed.item.noted', {
            itemId: id,
            narrative: dto.narrative,
        });

        return updatedItem;
    }
    

}