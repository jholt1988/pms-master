import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailService, EMAIL_QUEUE_NAME } from './email.service';

/**
 * Consumes the `email` BullMQ queue and performs the actual (SMTP) send off the
 * request path. Registered only when the queue is enabled (see EmailModule).
 */
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    switch (job.name) {
      case 'payment-confirmation': {
        const { email, amount, paymentDate } = job.data as {
          email: string;
          amount: number;
          paymentDate: string;
        };
        await this.emailService.sendRentPaymentConfirmation(
          email,
          amount,
          new Date(paymentDate),
        );
        return;
      }
      default:
        this.logger.warn(`Unknown email job type: ${job.name}`);
    }
  }
}
