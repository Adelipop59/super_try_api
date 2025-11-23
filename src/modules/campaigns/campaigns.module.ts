import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignCriteriaService } from './campaign-criteria.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignCriteriaService],
  exports: [CampaignsService, CampaignCriteriaService],
})
export class CampaignsModule {}
