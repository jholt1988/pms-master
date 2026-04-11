import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TransitionOptions {
  model: string;
  id: string | number;
  fromStatus: string;
  toStatus: string;
  currentVersion: number;
  additionalData?: Record<string, any>;
  sideEffects?: (tx: any) => Promise<void>;
}

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async transition(options: TransitionOptions): Promise<any> {
    const { model, id, fromStatus, toStatus, currentVersion, additionalData, sideEffects } = options;

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx[model].updateMany({
        where: { id, status: fromStatus, version: currentVersion },
        data: {
          status: toStatus,
          version: { increment: 1 },
          ...additionalData,
        },
      });

      if (updated.count === 0) {
        throw new ConflictException(
          `${model} ${id} cannot transition from ${fromStatus} to ${toStatus} ` +
            `(version ${currentVersion}) — record may have been modified concurrently`,
        );
      }

      if (sideEffects) {
        await sideEffects(tx);
      }

      return tx[model].findUnique({ where: { id } });
    });
  }
}
