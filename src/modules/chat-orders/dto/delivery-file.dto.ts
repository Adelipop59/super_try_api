import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryFileDto {
  @ApiProperty({
    type: String,
    description: 'URL du fichier uploadé',
    example: 'https://s3.amazonaws.com/bucket/chat-orders/session-id/video.mp4',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    type: String,
    description: 'Nom du fichier',
    example: 'ugc-video-30s.mp4',
  })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    type: Number,
    description: 'Taille du fichier en bytes',
    example: 5242880,
  })
  @IsNumber()
  @IsNotEmpty()
  size!: number;

  @ApiProperty({
    type: String,
    description: 'Type MIME du fichier',
    example: 'video/mp4',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;
}

export class DeliverOrderDto {
  @ApiProperty({
    type: [DeliveryFileDto],
    description: 'Liste des fichiers de livraison (preuves)',
    example: [
      {
        url: 'https://s3.amazonaws.com/bucket/chat-orders/session-id/video.mp4',
        filename: 'ugc-video-30s.mp4',
        size: 5242880,
        type: 'video/mp4',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryFileDto)
  deliveryProof!: DeliveryFileDto[];

  @ApiProperty({
    type: String,
    description: 'Message optionnel accompagnant la livraison',
    example:
      "Voici la vidéo UGC demandée. J'ai mis en avant les 3 fonctionnalités principales.",
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
