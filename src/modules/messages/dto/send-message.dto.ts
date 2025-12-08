import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour une pièce jointe avec métadonnées
 */
export class MessageAttachmentDto {
  @ApiProperty({
    description: 'URL du fichier (depuis endpoint upload)',
    example: 'https://s3.amazonaws.com/bucket/messages/session-id/file.jpg',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Nom original du fichier',
    example: 'receipt.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    description: 'Taille du fichier en octets',
    example: 245678,
  })
  @IsNumber()
  @IsNotEmpty()
  size!: number;

  @ApiProperty({
    description: 'Type MIME du fichier',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;
}

/**
 * DTO pour envoyer un message
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Contenu du message',
    example:
      "Bonjour, j'ai bien reçu le produit et je commence les tests aujourd'hui.",
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @ApiProperty({
    description: 'Pièces jointes avec métadonnées (images, PDFs, vidéos)',
    type: [MessageAttachmentDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}
