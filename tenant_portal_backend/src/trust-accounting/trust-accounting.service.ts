import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrustAccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccounts(organizationId: string) {
    return this.prisma.trustAccount.findMany({ where: { organizationId } });
  }

  async createAccount(data: { organizationId: string; name: string; accountNumber?: string; bankName?: string }) {
    return this.prisma.trustAccount.create({ data });
  }

  async recordTransaction(trustAccountId: string, data: { type: string; amountCents: number; description?: string; reference?: string }) {
    const tx = await this.prisma.trustTransaction.create({ data: { trustAccountId, ...data } });
    const delta = data.type === 'DEBIT' ? -data.amountCents : data.amountCents;
    await this.prisma.trustAccount.update({ where: { id: trustAccountId }, data: { balanceCents: { increment: delta } } });
    return tx;
  }

  async reconcile(trustAccountId: string) {
    await this.prisma.trustTransaction.updateMany({ where: { trustAccountId, reconciled: false }, data: { reconciled: true, reconciledAt: new Date() } });
    return { ok: true };
  }
}
