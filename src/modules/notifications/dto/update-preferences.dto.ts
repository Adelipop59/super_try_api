import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour mettre à jour les préférences de notification
 */
export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Activer les notifications par email',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiProperty({
    description: 'Activer les notifications par SMS',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiProperty({
    description: 'Activer les notifications push',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiProperty({
    description: 'Activer les notifications in-app',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @ApiProperty({
    description: 'Notifications de session',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  sessionNotifications?: boolean;

  @ApiProperty({
    description: 'Notifications de message',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  messageNotifications?: boolean;

  @ApiProperty({
    description: 'Notifications de paiement',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  paymentNotifications?: boolean;

  @ApiProperty({
    description: 'Notifications de campagne',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  campaignNotifications?: boolean;

  @ApiProperty({
    description: 'Notifications système',
    required: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  systemNotifications?: boolean;
}
