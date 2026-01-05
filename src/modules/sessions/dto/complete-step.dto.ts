import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
  IsObject,
  ValidateIf,
} from 'class-validator';

/**
 * DTO pour compléter une étape de test
 * La validation spécifique selon le type d'étape sera faite dans le service
 * Supporte deux formats pour rétrocompatibilité:
 * 1. Nouveau format: { response, comment?, attachments? }
 * 2. Ancien format: { submissionData: {...} }
 */
export class CompleteStepDto {
  @ApiProperty({
    description:
      'Réponse de l\'étape (format dépend du type: string, number, array, etc.)',
    example: 'Texte de réponse ou URL ou note',
    required: false,
  })
  @ValidateIf((o) => !o.submissionData)
  @IsNotEmpty({ message: 'La réponse est obligatoire' })
  response?: any;

  @ApiProperty({
    description: 'Commentaire optionnel du testeur',
    example: 'Le produit est conforme aux attentes',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'URLs des fichiers uploadés (photos, vidéos)',
    type: [String],
    required: false,
    example: ['https://storage.supabase.co/step-photo-1.jpg'],
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  attachments?: string[];

  @ApiProperty({
    description: 'Format ancien - données de soumission complètes',
    required: false,
    example: {
      response: 'Ma réponse',
      comment: 'Commentaire optionnel',
    },
  })
  @ValidateIf((o) => !o.response)
  @IsObject()
  @IsOptional()
  submissionData?: Record<string, any>;
}
