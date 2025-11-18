import { PartialType } from '@nestjs/swagger';
import { CreateCampaignCriteriaDto } from './create-campaign-criteria.dto';

export class UpdateCampaignCriteriaDto extends PartialType(
  CreateCampaignCriteriaDto,
) {}
