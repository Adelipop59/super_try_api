import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour modifier le statut KYC d'un testeur
 */
export class UpdateKycStatusDto {
  @ApiProperty({
    description: 'Nouveau statut de vérification KYC',
    enum: ['unverified', 'pending', 'verified', 'failed'],
    example: 'verified',
  })
  @IsEnum(['unverified', 'pending', 'verified', 'failed'])
  status: 'unverified' | 'pending' | 'verified' | 'failed';

  @ApiProperty({
    description: 'Raison de l\'échec (obligatoire si status = failed)',
    required: false,
    example: 'Document expiré',
  })
  @IsOptional()
  @IsString()
  failureReason?: string;
}

/**
 * DTO de réponse après modification du statut KYC
 */
export class KycStatusResponseDto {
  @ApiProperty({
    description: 'ID de l\'utilisateur',
    example: 'uuid-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'testeur@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Nouveau statut de vérification',
    enum: ['unverified', 'pending', 'verified', 'failed'],
    example: 'verified',
  })
  verificationStatus: string;

  @ApiProperty({
    description: 'Date de vérification (si verified)',
    required: false,
    example: '2025-12-16T10:30:00Z',
  })
  verifiedAt: Date | null;

  @ApiProperty({
    description: 'Raison de l\'échec (si failed)',
    required: false,
    example: 'Document expiré',
  })
  failureReason: string | null;
}
