import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule], // LogsModule est @Global
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService], // Export pour utilisation dans d'autres modules
})
export class MessagesModule {}
