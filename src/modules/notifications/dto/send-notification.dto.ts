import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationChannel } from '@prisma/client';

/**
 * DTO pour envoyer une notification (usage interne - API simple)
 */
export class SendNotificationDto {
  @ApiProperty({
    description: "ID de l'utilisateur destinataire",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.SESSION_ACCEPTED,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @ApiProperty({
    description: 'Canal de notification',
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
  })
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel!: NotificationChannel;

  @ApiProperty({
    description: 'Titre de la notification',
    example: 'Candidature acceptée !',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'Message de la notification',
    example:
      'Votre candidature pour la campagne "Test Produit X" a été acceptée par le vendeur.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Données additionnelles (liens, IDs, etc.)',
    required: false,
    example: { sessionId: 'abc123', campaignId: 'def456' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
