import { Module, forwardRef } from '@nestjs/common';
import { ChatOrdersService } from './chat-orders.service';
import { ChatOrdersController } from './chat-orders.controller';
import { PrismaModule } from '../../database/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    WalletsModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ChatOrdersController],
  providers: [ChatOrdersService],
  exports: [ChatOrdersService],
})
export class ChatOrdersModule {}
