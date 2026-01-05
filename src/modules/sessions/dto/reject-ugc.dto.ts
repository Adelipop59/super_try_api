import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectUGCDto {
  @ApiProperty({
    description: 'Raison du rejet des UGC',
    example: 'La vidéo ne montre pas suffisamment le produit en action',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'La raison du rejet doit contenir au moins 10 caractères',
  })
  rejectionReason!: string;
}
