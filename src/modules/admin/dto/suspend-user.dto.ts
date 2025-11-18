import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour suspendre un utilisateur
 */
export class SuspendUserDto {
  @ApiProperty({
    description: 'Raison de la suspension',
    example: "Violation des conditions d'utilisation - spam",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;

  @ApiProperty({
    description:
      'Date de fin de suspension (optionnel, si non fourni = suspension permanente)',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  suspendedUntil?: string;
}

/**
 * DTO pour la réponse de suspension
 */
export class SuspensionResponseDto {
  @ApiProperty({
    description: "ID de l'utilisateur",
    example: 'uuid-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Statut de suspension',
    example: true,
  })
  isSuspended: boolean;

  @ApiProperty({
    description: 'Raison de la suspension',
    example: "Violation des conditions d'utilisation",
  })
  suspensionReason: string | null;

  @ApiProperty({
    description: 'Date de fin de suspension',
    example: '2025-12-31T23:59:59Z',
  })
  suspendedUntil: Date | null;

  @ApiProperty({
    description: 'Date de la suspension',
    example: '2025-01-15T10:30:00Z',
  })
  suspendedAt: Date | null;
}
