import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

/**
 * DTO pour mettre à jour une campagne
 * Tous les champs sont optionnels sauf les products qui sont gérés séparément
 */
export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, ['products'] as const),
) {}
