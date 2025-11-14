import { Module, Global } from '@nestjs/common';
import { LogsService } from './logs.service';
import { PrismaModule } from '../../database/prisma.module';

/**
 * Module de gestion des logs système
 *
 * Ce module est @Global(), ce qui signifie que LogsService est disponible
 * dans tous les autres modules sans avoir besoin de l'importer explicitement.
 *
 * Il suffit d'injecter LogsService dans le constructeur de n'importe quel service ou controller.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
