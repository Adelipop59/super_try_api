import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'URLs des fichiers joints (photos, documents)',
    example: [
      'https://storage.example.com/file1.jpg',
      'https://storage.example.com/file2.pdf',
    ],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];
}
