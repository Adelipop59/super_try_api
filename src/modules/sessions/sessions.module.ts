import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../../database/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { StripeModule } from '../stripe/stripe.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    PrismaModule,
    WalletsModule, // Pour injecter WalletsService
    StripeModule, // Pour injecter StripeService
    CampaignsModule, // Pour injecter CampaignCriteriaService
  ], // LogsModule est @Global, pas besoin de l'importer
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService], // Export pour utilisation dans d'autres modules
})
export class SessionsModule {}
