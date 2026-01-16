import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';
import { SupabaseModule } from '../../common/supabase/supabase.module';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    forwardRef(() => NotificationsModule), // forwardRef pour éviter circular dependency
    UploadModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway], // Export pour utilisation dans d'autres modules
})
export class MessagesModule {}
