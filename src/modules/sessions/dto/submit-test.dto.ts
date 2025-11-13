import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour soumettre le test complété
 */
export class SubmitTestDto {
  @ApiProperty({
    description: 'Données du test (photos, vidéos, réponses aux étapes)',
    example: {
      steps: [
        { stepId: 'step-1', type: 'TEXT', response: 'Produit bien reçu' },
        { stepId: 'step-2', type: 'PHOTO', response: 'https://...' },
        { stepId: 'step-3', type: 'RATING', response: 5 },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  submissionData!: Record<string, any>;
}
