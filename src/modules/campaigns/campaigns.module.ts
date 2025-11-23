import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignCriteriaController } from './campaign-criteria.controller';
import { CampaignCriteriaService } from './campaign-criteria.service';
import { PrismaModule } from '../../database/prisma.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [CampaignsController, CampaignCriteriaController],
  providers: [CampaignsService, CampaignCriteriaService],
  exports: [CampaignsService, CampaignCriteriaService],
})
export class CampaignsModule {}
