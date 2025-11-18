import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalMethod } from '@prisma/client';

/**
 * DTO pour créer une demande de retrait
 */
export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Montant du retrait (en euros)',
    example: 50.0,
    minimum: 10,
  })
  @IsNumber()
  @IsPositive()
  @Min(10, { message: 'Le montant minimum de retrait est de 10€' })
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Méthode de retrait',
    enum: WithdrawalMethod,
    example: WithdrawalMethod.BANK_TRANSFER,
  })
  @IsEnum(WithdrawalMethod)
  @IsNotEmpty()
  method: WithdrawalMethod;

  @ApiProperty({
    description: 'Détails de paiement (IBAN pour virement, etc.)',
    example: {
      iban: 'FR7612345678901234567890123',
      bic: 'BNPAFRPPXXX',
      accountHolder: 'Jean Dupont',
    },
  })
  @IsObject()
  @IsNotEmpty()
  paymentDetails: Record<string, unknown>;
}
