import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour créer un litige (testeur ou vendeur)
 */
export class DisputeSessionDto {
  @ApiProperty({
    description: 'Raison du litige',
    example: 'Le produit reçu ne correspond pas à la description',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
