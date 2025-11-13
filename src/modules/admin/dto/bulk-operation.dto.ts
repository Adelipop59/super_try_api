import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour les opérations en masse
 */
export class BulkDeleteDto {
  @ApiProperty({
    description: 'Liste des IDs à supprimer',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsUUID('4', { each: true })
  ids: string[];
}

/**
 * DTO pour la réponse d'opération en masse
 */
export class BulkOperationResponseDto {
  @ApiProperty({
    description: 'Nombre d\'éléments traités avec succès',
    example: 25,
  })
  successCount: number;

  @ApiProperty({
    description: 'Nombre d\'échecs',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'IDs traités avec succès',
    example: ['uuid-1', 'uuid-2'],
  })
  successIds: string[];

  @ApiProperty({
    description: 'IDs en échec avec raisons',
    example: [{ id: 'uuid-3', reason: 'Not found' }],
  })
  failures: Array<{ id: string; reason: string }>;

  @ApiProperty({
    description: 'Message de résumé',
    example: '25 éléments supprimés, 2 échecs',
  })
  message: string;
}
