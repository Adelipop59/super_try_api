import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignProductDto } from './create-campaign.dto';

/**
 * DTO pour ajouter des produits à une campagne existante
 */
export class AddProductsToCampaignDto {
  @ApiProperty({
    description: 'Liste des produits à ajouter à la campagne',
    type: [CampaignProductDto],
    example: [
      { productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 20 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CampaignProductDto)
  products!: CampaignProductDto[];
}
