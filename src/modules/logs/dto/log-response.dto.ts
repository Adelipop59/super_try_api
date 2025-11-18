import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LogLevel, LogCategory } from '@prisma/client';

/**
 * DTO pour les informations utilisateur dans les logs
 */
export class LogUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'USER' })
  role!: string;

  @ApiPropertyOptional({ example: 'Jean' })
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Dupont' })
  lastName?: string | null;
}

/**
 * DTO pour la réponse d'un log (sans détails sensibles)
 */
export class LogResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ enum: LogLevel, example: LogLevel.INFO })
  level!: LogLevel;

  @ApiProperty({ enum: LogCategory, example: LogCategory.AUTH })
  category!: LogCategory;

  @ApiProperty({ example: '✅ [AUTH] Connexion réussie pour user@example.com' })
  message!: string;

  @ApiPropertyOptional({
    example: {
      user: {
        id: '123',
        email: 'user@example.com',
        role: 'USER',
      },
    },
  })
  user?: LogUserDto | null;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  ipAddress?: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  userAgent?: string | null;

  @ApiPropertyOptional({ example: '/api/v1/auth/login' })
  endpoint?: string | null;

  @ApiPropertyOptional({ example: 'POST' })
  method?: string | null;

  @ApiPropertyOptional({ example: 200 })
  statusCode?: number | null;

  @ApiPropertyOptional({ example: 125 })
  duration?: number | null;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;
}

/**
 * DTO pour la réponse détaillée d'un log (ADMIN uniquement - inclut details)
 */
export class LogDetailResponseDto extends LogResponseDto {
  @ApiPropertyOptional({
    description: 'Données complètes du log (visible ADMIN uniquement)',
    example: {
      userId: '123',
      additionalData: 'Some sensitive data',
    },
  })
  details?: any;
}

/**
 * DTO pour la réponse paginée de logs
 */
export class LogListResponseDto {
  @ApiProperty({ type: [LogResponseDto] })
  logs!: LogResponseDto[];

  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;
}

/**
 * DTO pour les statistiques des logs
 */
export class LogStatsResponseDto {
  @ApiProperty({ example: 1523 })
  totalLogs!: number;

  @ApiProperty({
    description: 'Nombre de logs par niveau',
    example: {
      INFO: 1000,
      SUCCESS: 450,
      WARNING: 50,
      ERROR: 20,
      DEBUG: 3,
    },
  })
  byLevel!: Record<string, number>;

  @ApiProperty({
    description: 'Nombre de logs par catégorie',
    example: {
      AUTH: 500,
      USER: 300,
      PRODUCT: 200,
      CAMPAIGN: 150,
    },
  })
  byCategory!: Record<string, number>;

  @ApiProperty({
    description: 'Dernières erreurs',
    type: 'array',
    example: [
      {
        id: '123',
        message: '❌ [AUTH] Échec connexion',
        category: 'AUTH',
        userEmail: 'user@example.com',
        createdAt: '2025-01-15T10:00:00.000Z',
      },
    ],
  })
  recentErrors!: Array<{
    id: string;
    message: string;
    category: string;
    userEmail?: string;
    createdAt: Date;
  }>;
}
