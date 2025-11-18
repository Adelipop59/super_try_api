import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

export class CompleteStepDto {
  @ApiProperty({
    description:
      'Données soumises pour ce step (photos, texte, checklist, rating, etc.)',
    example: {
      photos: ['https://example.com/photo1.jpg'],
      text: "Voici ma capture d'écran du produit",
      rating: 5,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  submissionData?: Record<string, any>;
}
