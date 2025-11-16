import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de réponse pour un message de chat
 */
export class ChatMessageResponseDto {
  @ApiProperty({ description: 'ID du message' })
  id!: string;

  @ApiProperty({ description: 'ID de la session' })
  sessionId!: string;

  @ApiProperty({ description: "ID de l'expéditeur" })
  senderId!: string;

  @ApiProperty({ description: 'Contenu du message' })
  content!: string;

  @ApiProperty({
    description: 'URLs des fichiers joints',
    required: false,
    type: [String],
  })
  attachments?: string[] | null;

  @ApiProperty({ description: 'Message lu ou non' })
  isRead!: boolean;

  @ApiProperty({
    description: 'Date de lecture',
    required: false,
  })
  readAt?: Date | null;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;

  // Relations optionnelles
  @ApiProperty({
    description: "Informations de l'expéditeur",
    required: false,
  })
  sender?: any;

  @ApiProperty({
    description: 'Informations de la session',
    required: false,
  })
  session?: any;
}
