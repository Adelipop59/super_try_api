import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DeclineUGCDto {
  @ApiProperty({
    description: 'Raison du refus de soumettre les UGC',
    example:
      'Je ne peux pas créer de vidéo TikTok car je n\'ai pas de compte actif',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'La raison doit contenir au moins 10 caractères' })
  declineReason!: string;
}
