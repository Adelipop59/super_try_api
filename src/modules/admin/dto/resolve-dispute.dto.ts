import { IsString, IsNotEmpty, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Type de résolution de litige
 */
export enum DisputeResolutionType {
  FAVOR_TESTER = 'FAVOR_TESTER', // En faveur du testeur
  FAVOR_SELLER = 'FAVOR_SELLER', // En faveur du vendeur
  PARTIAL_REFUND = 'PARTIAL_REFUND', // Remboursement partiel
  NO_FAULT = 'NO_FAULT', // Aucune faute
}

/**
 * DTO pour résoudre un litige
 */
export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Type de résolution du litige',
    enum: DisputeResolutionType,
    example: DisputeResolutionType.FAVOR_TESTER,
  })
  @IsEnum(DisputeResolutionType)
  @IsNotEmpty()
  resolutionType: DisputeResolutionType;

  @ApiProperty({
    description: 'Commentaire de résolution (explication de la décision)',
    example: 'Le testeur a fourni des preuves suffisantes. Le vendeur doit rembourser.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  resolutionComment: string;
}
