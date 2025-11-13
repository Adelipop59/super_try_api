import { ApiProperty } from '@nestjs/swagger';
import { LogLevel, LogCategory } from '@prisma/client';

/**
 * DTO pour un item d'activité utilisateur
 */
export class ActivityLogItemDto {
  @ApiProperty({
    description: 'ID du log',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Niveau du log',
    enum: LogLevel,
    example: LogLevel.INFO,
  })
  level: LogLevel;

  @ApiProperty({
    description: 'Catégorie du log',
    enum: LogCategory,
    example: LogCategory.SESSION,
  })
  category: LogCategory;

  @ApiProperty({
    description: 'Message du log',
    example: '✅ Session de test complétée avec succès',
  })
  message: string;

  @ApiProperty({
    description: 'Métadonnées additionnelles',
    example: { sessionId: 'uuid-456', campaignId: 'uuid-789' },
  })
  metadata: any;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * DTO pour l'historique d'activité d'un utilisateur
 */
export class UserActivityLogDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur',
    example: 'uuid-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'user@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Nombre total d\'activités',
    example: 150,
  })
  totalActivities: number;

  @ApiProperty({
    description: 'Dernière activité',
    example: '2025-01-15T10:30:00Z',
  })
  lastActivity: Date;

  @ApiProperty({
    description: 'Liste des activités',
    type: [ActivityLogItemDto],
  })
  activities: ActivityLogItemDto[];

  @ApiProperty({
    description: 'Résumé par catégorie',
    example: {
      AUTH: 50,
      SESSION: 80,
      MESSAGE: 20,
    },
  })
  summaryByCategory: Record<string, number>;
}
