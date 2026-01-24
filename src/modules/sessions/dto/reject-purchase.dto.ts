import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectPurchaseDto {
  @ApiProperty({
    description: "Raison du refus de la preuve d'achat",
    example: 'Numéro de commande invalide, veuillez vérifier et resoumettre',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'La raison doit contenir au moins 10 caractères' })
  rejectionReason!: string;
}
