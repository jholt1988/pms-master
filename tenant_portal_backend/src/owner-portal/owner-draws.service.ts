import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OwnerDrawsService {
  private readonly logger = new Logger(OwnerDrawsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDraw(statementId: string, amountCents: number, bankAccountId: string) {
    this.logger.log(`Initiating draw of ${amountCents} cents for statement ${statementId}`);
    return this.prisma.ownerDraw.create({
      data: {
        ownerStatementId: statementId,
        amountCents,
        bankAccountId,
        status: 'PROCESSING',
      }
    });
  }

  async getDrawsByStatement(statementId: string) {
    return this.prisma.ownerDraw.findMany({
      where: { ownerStatementId: statementId }
    });
  }
}
