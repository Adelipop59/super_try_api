import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ChatOrderType } from '@prisma/client';

export class CreateChatOrderDto {
  @ApiProperty({
    enum: ChatOrderType,
    description: 'Type de commande : UGC (contenu), PHOTO (photos supplémentaires), ou TIP (pourboire)',
    example: 'UGC_REQUEST',
  })
  @IsEnum(ChatOrderType)
  @IsNotEmpty()
  type!: ChatOrderType;

  @ApiProperty({
    type: Number,
    description: 'Montant de la commande en euros (1-10000)',
    example: 50,
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber()
  @Min(1)
  @Max(10000)
  amount!: number;

  @ApiProperty({
    type: String,
    description: 'Description détaillée de la commande',
    example: 'Je souhaite une vidéo UGC de 30 secondes mettant en avant les fonctionnalités principales du produit',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date limite de livraison (optionnel)',
    example: '2025-12-15T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  deliveryDeadline?: string;

  @ApiProperty({
    description: 'Métadonnées additionnelles (optionnel)',
    example: { videoLength: '30s', format: 'MP4' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
