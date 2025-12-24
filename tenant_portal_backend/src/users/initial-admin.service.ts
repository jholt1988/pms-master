import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Bootstraps an initial admin user on application startup when enabled by env flag.
 * Only runs in non-production environments to avoid default credentials in production.
 */
@Injectable()
export class InitialAdminService implements OnModuleInit {
  private readonly logger = new Logger(InitialAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (nodeEnv === 'production') {
      this.logger.debug('Initial admin bootstrap skipped in production environment.');
      return;
    }

    if (!this.isBootstrapEnabled()) {
      return;
    }

    await this.ensureInitialAdmin(nodeEnv);
  }

  private isBootstrapEnabled(): boolean {
    const raw = this.configService.get<string>('ADMIN_BOOTSTRAP_ENABLED');
    return raw === 'true' || raw === '1';
  }

  private async ensureInitialAdmin(nodeEnv: string): Promise<void> {
    const role = Role.ADMIN;

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role },
    });

    if (existingAdmin) {
      this.logger.debug('Admin user already exists; skipping bootstrap.');
      return;
    }

    const username =
      this.configService.get<string>('ADMIN_BOOTSTRAP_USERNAME') || 'admin';
    const email =
      this.configService.get<string>('ADMIN_BOOTSTRAP_EMAIL') ||
      'admin@admin.com';
    const passwordPlain =
      this.configService.get<string>('ADMIN_BOOTSTRAP_PASSWORD') || 'admin';
    const firstName =
      this.configService.get<string>('ADMIN_BOOTSTRAP_FIRST_NAME') || 'Admin';
    const lastName =
      this.configService.get<string>('ADMIN_BOOTSTRAP_LAST_NAME') || 'User';

    // Avoid promoting an existing non-admin user silently
    const conflictingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
    if (conflictingUser) {
      this.logger.warn(
        `Bootstrap admin skipped: user with username/email already exists (id=${conflictingUser.id}, role=${conflictingUser.role}).`,
      );
      return;
    }

    const password = await bcrypt.hash(passwordPlain, 10);

    const adminUser = await this.prisma.user.create({
      data: {
        username,
        email,
        password,
        firstName,
        lastName,
        role,
      },
    });

    this.logger.log(
      `Bootstrapped initial admin '${adminUser.username}' (${adminUser.email}) in ${nodeEnv} environment.`,
    );
  }
}
