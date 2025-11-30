import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Service for managing the system user used for automated operations
 * The system user is used for:
 * - System-generated notes
 * - Automated escalations
 * - AI-generated actions
 */
@Injectable()
export class SystemUserService implements OnModuleInit {
  private readonly logger = new Logger(SystemUserService.name);
  private systemUserId: number | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize system user on module startup
   */
  async onModuleInit() {
    await this.ensureSystemUser();
  }

  /**
   * Get or create the system user
   * Returns the system user ID
   */
  async getSystemUserId(): Promise<number> {
    if (this.systemUserId) {
      return this.systemUserId;
    }

    await this.ensureSystemUser();
    return this.systemUserId!;
  }

  /**
   * Ensure system user exists, create if not
   */
  private async ensureSystemUser(): Promise<void> {
    try {
      // Try to find existing system user
      let systemUser = await this.prisma.user.findFirst({
        where: {
          username: 'system',
          role: Role.PROPERTY_MANAGER, // System user uses property manager role for permissions
        },
      });

      if (!systemUser) {
        // Create system user
        // Generate a secure random password (won't be used for login)
        const randomPassword = await bcrypt.hash(
          `system-${Date.now()}-${Math.random()}`,
          10,
        );

        systemUser = await this.prisma.user.create({
          data: {
            username: 'system',
            password: randomPassword, // Secure random password, not used for login
            role: Role.PROPERTY_MANAGER,
            // Mark as system user in metadata if needed
          },
        });

        this.logger.log(`Created system user with ID: ${systemUser.id}`);
      } else {
        this.logger.debug(`System user found with ID: ${systemUser.id}`);
      }

      this.systemUserId = systemUser.id;
    } catch (error) {
      this.logger.error('Failed to ensure system user exists:', error);
      // Fallback: try to find any admin user as last resort
      const fallbackAdmin = await this.prisma.user.findFirst({
        where: { role: Role.PROPERTY_MANAGER },
      });
      if (fallbackAdmin) {
        this.logger.warn(
          `Using fallback admin user (ID: ${fallbackAdmin.id}) as system user`,
        );
        this.systemUserId = fallbackAdmin.id;
      } else {
        this.logger.error(
          'No system user or admin user found. System operations may fail.',
        );
      }
    }
  }

  /**
   * Check if a user ID is the system user
   */
  async isSystemUser(userId: number): Promise<boolean> {
    const systemId = await this.getSystemUserId();
    return userId === systemId;
  }
}

