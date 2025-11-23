import { PartialType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

/**
 * DTO pour mettre à jour une campagne
 * Tous les champs sont optionnels, y compris les products
 */
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}
