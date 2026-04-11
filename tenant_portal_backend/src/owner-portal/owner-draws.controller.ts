import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OwnerDrawsService } from './owner-draws.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgId } from '../common/org-context/org-id.decorator';

@Controller('owner-portal/draws')
@UseGuards(AuthGuard('jwt'))
export class OwnerDrawsController {
  constructor(private readonly service: OwnerDrawsService) {}

  @Post('statement/:statementId')
  createDraw(@Param('statementId') statementId: string, @Body() data: any) {
    return this.service.createDraw(statementId, data.amountCents, data.bankAccountId);
  }

  @Get('statement/:statementId')
  getDraws(@Param('statementId') statementId: string) {
    return this.service.getDrawsByStatement(statementId);
  }
}
