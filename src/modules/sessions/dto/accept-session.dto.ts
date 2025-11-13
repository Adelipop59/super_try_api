import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour accepter une session (pas de body requis, juste l'ID en param)
 */
export class AcceptSessionResponseDto {
  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Session acceptée avec succès',
  })
  message!: string;
}
