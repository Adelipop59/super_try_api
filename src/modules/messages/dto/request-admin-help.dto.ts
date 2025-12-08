import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour demander l'aide d'un admin dans une conversation
 */
export class RequestAdminHelpDto {
  @ApiProperty({
    description: 'Raison de la demande d\'aide admin',
    example: 'Le vendeur ne répond plus aux messages depuis 3 jours',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
