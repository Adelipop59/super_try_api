import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

/**
 * DTO pour résoudre un litige (admin uniquement)
 */
export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Explication de la résolution du litige',
    example: 'Remboursement approuvé, session annulée suite à la vérification des preuves',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resolution!: string;

  @ApiProperty({
    description: 'Nouveau statut de la session après résolution',
    enum: SessionStatus,
    example: SessionStatus.CANCELLED,
  })
  @IsEnum(SessionStatus)
  @IsNotEmpty()
  newStatus!: SessionStatus;
}
