import { Injectable, Logger } from '@nestjs/common';
import { PaymentReminderStrategy, PaymentRiskStrategy } from './payment-strategy.types';

@Injectable()
export class PaymentStrategyRegistry {
  private readonly logger = new Logger(PaymentStrategyRegistry.name);

  private readonly riskStrategies = new Map<string, PaymentRiskStrategy>();
  private readonly reminderStrategies = new Map<string, PaymentReminderStrategy>();

  registerRiskStrategy(strategy: PaymentRiskStrategy): void {
    this.riskStrategies.set(strategy.name, strategy);
    this.logger.debug(`Registered payment risk strategy: ${strategy.name}`);
  }

  registerReminderStrategy(strategy: PaymentReminderStrategy): void {
    this.reminderStrategies.set(strategy.name, strategy);
    this.logger.debug(`Registered payment reminder strategy: ${strategy.name}`);
  }

  getRiskStrategy(name: string): PaymentRiskStrategy | undefined {
    return this.riskStrategies.get(name);
  }

  getReminderStrategy(name: string): PaymentReminderStrategy | undefined {
    return this.reminderStrategies.get(name);
  }

  listRiskStrategies(): string[] {
    return Array.from(this.riskStrategies.keys());
  }

  listReminderStrategies(): string[] {
    return Array.from(this.reminderStrategies.keys());
  }
}
