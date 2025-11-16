import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour postuler à une campagne de test
 */
export class ApplySessionDto {
  @ApiProperty({
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  campaignId!: string;

  @ApiProperty({
    description: 'Message de motivation du testeur (optionnel)',
    example:
      "Je suis très intéressé par ce test car j'utilise déjà des produits similaires.",
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  applicationMessage?: string;
}
