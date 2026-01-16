import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ChatOrdersService } from './chat-orders.service';
import { ChatOrdersController } from './chat-orders.controller';
import { ChatOrdersScheduler } from './chat-orders.scheduler';
import { PrismaModule } from '../../database/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    WalletsModule,
    StripeModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ChatOrdersController],
  providers: [ChatOrdersService, ChatOrdersScheduler],
  exports: [ChatOrdersService],
})
export class ChatOrdersModule {}
