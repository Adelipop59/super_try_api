import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour refuser une session
 */
export class RejectSessionDto {
  @ApiProperty({
    description: 'Raison du refus',
    example: 'Profil non adapté pour ce test',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
