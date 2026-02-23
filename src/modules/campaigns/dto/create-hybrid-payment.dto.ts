import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateHybridPaymentDto {
  @ApiProperty({
    description: 'Montant à payer avec le wallet (optionnel)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  walletAmount?: number;

  @ApiProperty({
    description: 'Si true, utilise le maximum possible du wallet',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  useMaxWallet?: boolean;
}
