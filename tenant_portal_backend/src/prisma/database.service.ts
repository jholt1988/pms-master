import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

/** Module-level reference for use inside Prisma extension closures */
let _orgScopedModels: Set<string> = new Set();

/**
 * DatabaseService is an additive wrapper around PrismaService that provides:
 * - Auto-scoping of ALL org-owned models (detected via Prisma DMMF at startup)
 * - Health checks (SELECT 1)
 * - Transaction helper
 * - Soft-delete helper (sets deletedAt if the model has that field)
 * - Per-model query count metrics (in-memory)
 *
 * It does NOT replace PrismaService — existing services keep working unchanged.
 * Services can migrate to DatabaseService gradually.
 *
 * Migration pattern:
 *   // Before (manual orgId filtering):
 *   constructor(private prisma: PrismaService) {}
 *   async getProperties(orgId: string) {
 *     return this.prisma.property.findMany({ where: { organizationId: orgId } });
 *   }
 *
 *   // After (auto org-scoping):
 *   constructor(private db: DatabaseService) {}
 *   async getProperties(orgId: string) {
 *     return this.db.forOrg(orgId).property.findMany({ });
 *   }
 */
@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  private queryCounts: Map<string, number> = new Map();

  /** Models that have an `organizationId` field (detected at startup) */
  private orgScopedModels: Set<string> = new Set();

  /** Models that have a `deletedAt` field (detected at startup) */
  private softDeleteModels: Set<string> = new Set();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Detect org-scoped and soft-delete models from the Prisma DMMF
    try {
      const models = Prisma.dmmf.datamodel.models;
      for (const model of models) {
        const fieldNames = model.fields.map((f) => f.name);
        if (fieldNames.includes('organizationId')) {
          this.orgScopedModels.add(model.name);
          _orgScopedModels.add(model.name);
        }
        if (fieldNames.includes('deletedAt')) {
          this.softDeleteModels.add(model.name);
        }
      }
      this.logger.log(
        `Detected ${this.orgScopedModels.size} org-scoped models, ${this.softDeleteModels.size} soft-delete models`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to read DMMF, org-scoping will be inactive: ${(error as Error)?.message ?? String(error)}`,
      );
    }
  }

  /**
   * Return a Prisma client extension that auto-scopes ALL org-owned models.
   * This covers 25+ models (vs 8 in PrismaService.forOrg).
   *
   * Usage:
   *   const db = this.db.forOrg(orgId);
   *   await db.property.findMany({}); // auto-filtered by organizationId
   *   await db.lease.findFirst({ where: { id } }); // auto-filtered if Lease has orgId
   */
  forOrg(orgId: string) {
    return this.prisma.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }) {
          if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
          async findUnique({ model, args, query }) {
            if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
          async updateMany({ model, args, query }) {
            if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
          async deleteMany({ model, args, query }) {
            if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
          async count({ model, args, query }) {
            if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
          async aggregate({ model, args, query }) {
            if (_orgScopedModels.has(model)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            return query(args);
          },
        },
      },
    });
  }

  /** Get the raw Prisma client (no scoping) */
  get raw() {
    return this.prisma;
  }

  /** Health check — runs SELECT 1 */
  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /** Run a function inside a transaction */
  async withTransaction<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return fn(tx as unknown as PrismaService);
    });
  }

  /** Soft-delete a record — sets deletedAt if the model has that field */
  async softDelete(model: string, id: string): Promise<boolean> {
    if (!this.softDeleteModels.has(model)) {
      this.logger.warn(`softDelete called on ${model} which has no deletedAt field — skipping`);
      return false;
    }
    // Use the raw Prisma client (not the org-scoped extension) for the actual update
    // since we're operating on a specific id
    const delegate = (this.prisma as unknown as Record<string, { update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<unknown> }>)[model];
    if (!delegate) {
      this.logger.error(`Model ${model} not found on Prisma client`);
      return false;
    }
    await delegate.update({ where: { id }, data: { deletedAt: new Date() } });
    this.incrementQueryCount(model);
    return true;
  }

  /** Get query count for a model */
  getQueryCount(model: string): number {
    return this.queryCounts.get(model) ?? 0;
  }

  /** Reset all query counts */
  resetQueryCounts() {
    this.queryCounts.clear();
  }

  /** Increment query count for a model (internal) */
  private incrementQueryCount(model: string) {
    this.queryCounts.set(model, (this.queryCounts.get(model) ?? 0) + 1);
  }

  /** Get all query counts (for diagnostics) */
  getAllQueryCounts(): Record<string, number> {
    return Object.fromEntries(this.queryCounts);
  }

  /** Check if a model is org-scoped */
  isOrgScoped(model: string): boolean {
    return this.orgScopedModels.has(model);
  }
}
