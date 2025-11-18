import { Module, Global } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { PrismaModule } from '../../database/prisma.module';

/**
 * Module de gestion des logs système
 *
 * Ce module est @Global(), ce qui signifie que LogsService est disponible
 * dans tous les autres modules sans avoir besoin de l'importer explicitement.
 *
 * Il suffit d'injecter LogsService dans le constructeur de n'importe quel service ou controller.
 *
 * Le LogsController expose des endpoints REST pour les admins :
 * - GET /logs - Lister les logs avec filtres
 * - GET /logs/:id - Détails d'un log
 * - GET /logs/stats - Statistiques
 * - DELETE /logs/cleanup - Nettoyer les anciens logs
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
