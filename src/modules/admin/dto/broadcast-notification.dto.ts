import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '@prisma/client';

/**
 * Filtre de ciblage pour broadcast
 */
export enum BroadcastTargetFilter {
  ALL = 'ALL', // Tous les utilisateurs
  USERS_ONLY = 'USERS_ONLY', // Uniquement les testeurs
  PROS_ONLY = 'PROS_ONLY', // Uniquement les vendeurs
  VERIFIED_ONLY = 'VERIFIED_ONLY', // Uniquement les utilisateurs vérifiés
  ACTIVE_ONLY = 'ACTIVE_ONLY', // Uniquement les utilisateurs actifs
}

/**
 * DTO pour envoyer une notification broadcast
 */
export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.SYSTEM_ALERT,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Canal de notification',
    enum: NotificationChannel,
    example: NotificationChannel.IN_APP,
  })
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Maintenance planifiée',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiProperty({
    description: 'Message de la notification',
    example:
      'La plateforme sera en maintenance le 15 janvier de 2h à 4h du matin.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

  @ApiProperty({
    description: 'Filtre de ciblage',
    enum: BroadcastTargetFilter,
    example: BroadcastTargetFilter.ALL,
  })
  @IsEnum(BroadcastTargetFilter)
  @IsNotEmpty()
  targetFilter: BroadcastTargetFilter;

  @ApiProperty({
    description: 'Données additionnelles (optionnel)',
    required: false,
    example: { url: 'https://status.example.com', severity: 'info' },
  })
  @IsOptional()
  data?: any;
}

/**
 * DTO pour la réponse de broadcast
 */
export class BroadcastResponseDto {
  @ApiProperty({
    description: "Nombre d'utilisateurs ciblés",
    example: 1250,
  })
  targetedUsers: number;

  @ApiProperty({
    description: 'Nombre de notifications créées',
    example: 1250,
  })
  notificationsCreated: number;

  @ApiProperty({
    description: 'IDs des notifications créées',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
  })
  notificationIds: string[];

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Broadcast envoyé à 1250 utilisateurs',
  })
  message: string;
}
