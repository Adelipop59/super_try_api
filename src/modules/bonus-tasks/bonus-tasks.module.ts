import { Module } from '@nestjs/common';
import { BonusTasksController } from './bonus-tasks.controller';
import { BonusTasksService } from './bonus-tasks.service';
import { PrismaService } from '../../database/prisma.service';
import { LogsModule } from '../logs/logs.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [LogsModule, WalletsModule],
  controllers: [BonusTasksController],
  providers: [BonusTasksService, PrismaService],
  exports: [BonusTasksService],
})
export class BonusTasksModule {}
