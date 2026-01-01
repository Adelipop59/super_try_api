import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeConnectController } from './stripe-connect.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LogsModule } from '../logs/logs.module';
import { StripeTransactionHelper } from './helpers/stripe-transaction.helper';
import stripeConfig from '../../config/stripe.config';

@Module({
  imports: [ConfigModule.forFeature(stripeConfig), PrismaModule, NotificationsModule, LogsModule],
  controllers: [StripeController, StripeConnectController, StripeWebhookController],
  providers: [StripeService, StripeTransactionHelper],
  exports: [StripeService, StripeTransactionHelper],
})
export class StripeModule {}
