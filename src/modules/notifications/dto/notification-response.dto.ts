import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '@prisma/client';

/**
 * DTO de réponse pour une notification
 */
export class NotificationResponseDto {
  @ApiProperty({ description: 'ID de la notification' })
  id!: string;

  @ApiProperty({ description: "ID de l'utilisateur" })
  userId!: string;

  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
  })
  type!: NotificationType;

  @ApiProperty({
    description: 'Canal de notification',
    enum: NotificationChannel,
  })
  channel!: NotificationChannel;

  @ApiProperty({ description: 'Titre' })
  title!: string;

  @ApiProperty({ description: 'Message' })
  message!: string;

  @ApiProperty({
    description: 'Données additionnelles',
    required: false,
  })
  data?: any | null;

  @ApiProperty({ description: 'Notification envoyée' })
  isSent!: boolean;

  @ApiProperty({
    description: "Date d'envoi",
    required: false,
  })
  sentAt?: Date | null;

  @ApiProperty({ description: 'Notification lue' })
  isRead!: boolean;

  @ApiProperty({
    description: 'Date de lecture',
    required: false,
  })
  readAt?: Date | null;

  @ApiProperty({
    description: "Message d'erreur",
    required: false,
  })
  error?: string | null;

  @ApiProperty({ description: 'Nombre de tentatives' })
  retries!: number;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
