import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectOrderDto {
  @ApiProperty({
    type: String,
    description: 'Raison du refus de la commande',
    example: 'Je ne peux pas réaliser cette prestation dans les délais demandés',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
