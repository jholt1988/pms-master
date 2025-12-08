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

        try {
          systemUser = await this.prisma.user.create({
            data: {
              username: 'system',
              password: randomPassword, // Secure random password, not used for login
              role: Role.PROPERTY_MANAGER,
              // Mark as system user in metadata if needed
            },
          });

          this.logger.log(`Created system user with ID: ${systemUser.id}`);
        } catch (createError: any) {
          // Handle case where user was created between findFirst and create (race condition)
          if (createError?.code === 'P2002' && createError?.meta?.target?.includes('username')) {
            // User already exists, fetch it
            systemUser = await this.prisma.user.findFirst({
              where: {
                username: 'system',
                role: Role.PROPERTY_MANAGER,
              },
            });
            if (systemUser) {
              this.logger.debug(`System user already exists with ID: ${systemUser.id}`);
            }
          } else {
            throw createError;
          }
        }
      } else {
        this.logger.debug(`System user found with ID: ${systemUser.id}`);
      }

      if (systemUser) {
        this.systemUserId = systemUser.id;
      } else {
        throw new Error('Unable to find or create system user');
      }
    } catch (error) {
      this.logger.error('Failed to ensure system user exists:', error);
      // Fallback: try to find any admin or property manager user as last resort
      const fallbackUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { role: Role.ADMIN },
            { role: Role.PROPERTY_MANAGER },
          ],
        },
      });
      if (fallbackUser) {
        this.logger.warn(
          `Using fallback user (ID: ${fallbackUser.id}, role: ${fallbackUser.role}) as system user`,
        );
        this.systemUserId = fallbackUser.id;
      } else {
        this.logger.error(
          'No system user, admin, or property manager user found. System operations may fail.',
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

