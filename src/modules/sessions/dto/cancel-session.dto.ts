import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour annuler une session (testeur uniquement)
 */
export class CancelSessionDto {
  @ApiProperty({
    description: 'Raison de l\'annulation',
    example: 'Je ne peux plus participer pour des raisons personnelles',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
