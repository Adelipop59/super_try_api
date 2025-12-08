import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LogsModule } from '../logs/logs.module';
import { StripeTransactionHelper } from './helpers/stripe-transaction.helper';
import stripeConfig from '../../config/stripe.config';

@Module({
  imports: [ConfigModule.forFeature(stripeConfig), PrismaModule, NotificationsModule, LogsModule],
  controllers: [StripeController, StripeWebhookController],
  providers: [StripeService, StripeTransactionHelper],
  exports: [StripeService, StripeTransactionHelper],
})
export class StripeModule {}
