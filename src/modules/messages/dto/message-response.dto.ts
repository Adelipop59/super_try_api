import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour une pièce jointe dans la réponse message
 */
export class MessageAttachmentResponseDto {
  @ApiProperty({ description: 'URL du fichier' })
  url!: string;

  @ApiProperty({ description: 'Nom du fichier' })
  filename!: string;

  @ApiProperty({ description: 'Taille en octets' })
  size!: number;

  @ApiProperty({ description: 'Type MIME' })
  type!: string;

  @ApiProperty({ description: 'Date d\'upload' })
  uploadedAt!: string;

  @ApiProperty({ description: 'Ordre d\'affichage', required: false })
  order?: number;
}

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
    description: 'Pièces jointes avec métadonnées',
    type: [MessageAttachmentResponseDto],
    required: false,
  })
  attachments?: MessageAttachmentResponseDto[] | null;

  @ApiProperty({ description: 'Type de message', example: 'TEXT' })
  messageType!: string;

  @ApiProperty({ description: 'Est un message système', example: false })
  isSystemMessage!: boolean;

  @ApiProperty({ description: 'Message lu ou non' })
  isRead!: boolean;

  @ApiProperty({
    description: 'Date de lecture',
    required: false,
  })
  readAt?: Date | null;

  @ApiProperty({
    description: 'ID de l\'utilisateur qui a lu le message',
    required: false,
  })
  readBy?: string | null;

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
