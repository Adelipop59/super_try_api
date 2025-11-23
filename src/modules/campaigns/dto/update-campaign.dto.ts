import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';
import { Allow } from 'class-validator';

/**
 * DTO pour mettre à jour une campagne
 * Tous les champs sont optionnels, y compris les products et criteria
 * Note: La validation des products et criteria est gérée dans le service
 */
export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, ['products', 'criteria'] as const)
) {
  @Allow()
  products?: any; // Validation faite dans le service

  @Allow()
  criteria?: any; // Validation faite dans le service
}
