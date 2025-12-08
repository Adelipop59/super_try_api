import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DisputeOrderDto {
  @ApiProperty({
    type: String,
    description: 'Raison du litige concernant cette commande',
    example: 'Le contenu livré ne correspond pas à ce qui était demandé dans la description',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
