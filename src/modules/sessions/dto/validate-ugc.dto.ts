import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ValidateUGCDto {
  @ApiProperty({
    description: 'Commentaire de validation des UGC',
    example: 'Excellent contenu, merci !',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
