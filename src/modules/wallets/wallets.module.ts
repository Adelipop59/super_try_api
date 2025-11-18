import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Module({
  controllers: [WalletsController],
  providers: [WalletsService, PrismaService, SupabaseService],
  exports: [WalletsService], // Export pour utilisation dans d'autres modules
})
export class WalletsModule {}
