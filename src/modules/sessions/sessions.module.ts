import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule], // LogsModule est @Global, pas besoin de l'importer
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService], // Export pour utilisation dans d'autres modules
})
export class SessionsModule {}
