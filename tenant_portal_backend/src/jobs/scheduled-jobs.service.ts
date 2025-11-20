import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { subDays } from 'date-fns';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process due payments daily at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'processDuePayments',
    timeZone: 'America/New_York',
  })
  async processDuePayments() {
    this.logger.log('Checking for due payments...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find invoices due today
      const dueInvoices = await this.prisma.invoice.findMany({
        where: {
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
          status: 'PENDING',
        },
        include: {
          lease: {
            include: {
              tenant: true,
              unit: {
                include: { property: true }
              }
            }
          },
        },
      });

      this.logger.log(`Found ${dueInvoices.length} invoices due today`);

      // Here you would implement automatic payment processing
      // For now, just log the due invoices
      for (const invoice of dueInvoices) {
        this.logger.log(`Invoice ${invoice.id} is due: $${invoice.amount} for lease ${invoice.leaseId}`);
      }

    } catch (error) {
      this.logger.error('Failed to process due payments:', error);
    }
  }

  /**
   * Apply late fees daily at 3 AM
   */
  @Cron('0 3 * * *', {
    name: 'applyLateFees',
    timeZone: 'America/New_York',
  })
  async applyLateFees() {
    this.logger.log('Checking for overdue invoices to apply late fees...');

    try {
      const gracePeriodDays = 5;
      const cutoffDate = subDays(new Date(), gracePeriodDays);
      cutoffDate.setHours(0, 0, 0, 0);

      // Find overdue invoices without late fees
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          dueDate: {
            lt: cutoffDate,
          },
          status: 'PENDING',
          lateFees: {
            none: {},
          },
        },
        include: {
          payments: {
            where: { status: 'COMPLETED' }
          },
        },
      });

      let appliedCount = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Check if invoice is still unpaid
          const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
          
          if (totalPaid < invoice.amount) {
            // Apply late fee
            const lateFeeAmount = Math.max(50, invoice.amount * 0.05);
            
            await this.prisma.lateFee.create({
              data: {
                amount: lateFeeAmount,
                invoice: { connect: { id: invoice.id } },
              },
            });

            this.logger.log(`Applied late fee of $${lateFeeAmount} to invoice ${invoice.id}`);
            appliedCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to apply late fee for invoice ${invoice.id}:`, error);
        }
      }

      this.logger.log(`Applied ${appliedCount} late fees`);
    } catch (error) {
      this.logger.error('Failed to apply late fees:', error);
    }
  }

  /**
   * Check for lease expirations daily at 8 AM
   */
  @Cron('0 8 * * *', {
    name: 'checkLeaseExpirations',
    timeZone: 'America/New_York',
  })
  async checkLeaseExpirations() {
    this.logger.log('Checking for upcoming lease expirations...');

    try {
      const alertDays = [90, 60, 30, 14, 7];
      
      for (const days of alertDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find leases expiring on the target date
        const expiringLeases = await this.prisma.lease.findMany({
          where: {
            endDate: {
              gte: targetDate,
              lt: nextDay,
            },
            status: 'ACTIVE',
          },
          include: {
            tenant: true,
            unit: {
              include: { property: true }
            }
          },
        });

        if (expiringLeases.length > 0) {
          this.logger.log(`Found ${expiringLeases.length} leases expiring in ${days} days`);
          
          // Here you would send expiration alerts
          for (const lease of expiringLeases) {
            this.logger.log(`Lease ${lease.id} expires in ${days} days - tenant: ${lease.tenant?.username}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check lease expirations:', error);
    }
  }

  /**
   * Clean up old security events weekly
   */
  @Cron('0 1 * * 0', {
    name: 'weeklyCleanup',
    timeZone: 'America/New_York',
  })
  async weeklyCleanup() {
    this.logger.log('Starting weekly cleanup...');

    try {
      // Clean up old security events (keep last 90 days)
      const ninetyDaysAgo = subDays(new Date(), 90);
      
      const deletedEvents = await this.prisma.securityEvent.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      this.logger.log(`Deleted ${deletedEvents.count} old security events`);

    } catch (error) {
      this.logger.error('Weekly cleanup failed:', error);
    }
  }

  /**
   * Generate monthly reports on the 1st of each month at 6 AM
   */
  @Cron('0 6 1 * *', {
    name: 'generateMonthlyReports',
    timeZone: 'America/New_York',
  })
  async generateMonthlyReports() {
    this.logger.log('Generating monthly reports...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

      // Generate rental income report
      const rentalIncome = await this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          paymentDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

      // Generate maintenance costs report
      const maintenanceCosts = await this.prisma.expense.aggregate({
        where: {
          category: 'MAINTENANCE',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

      this.logger.log(`Monthly report for ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:`);
      this.logger.log(`  • Rental Income: $${rentalIncome._sum.amount || 0} (${rentalIncome._count} payments)`);
      this.logger.log(`  • Maintenance Costs: $${maintenanceCosts._sum.amount || 0} (${maintenanceCosts._count} expenses)`);
      
    } catch (error) {
      this.logger.error('Failed to generate monthly reports:', error);
    }
  }

  /**
   * Health check job - runs every 5 minutes to ensure cron jobs are working
   */
  @Cron('*/5 * * * *', {
    name: 'healthCheck',
  })
  async healthCheck() {
    // Just log that the job system is working
    // Only log this once per hour to avoid spam
    const now = new Date();
    if (now.getMinutes() === 0) {
      this.logger.log('Scheduled jobs system is healthy');
    }
  }
}