import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidatePurchaseDto {
  @ApiProperty({
    description: 'Commentaire de validation (optionnel)',
    example: 'Numéro de commande vérifié sur Amazon',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
