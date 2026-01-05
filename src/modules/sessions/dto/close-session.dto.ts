import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CloseSessionDto {
  @ApiProperty({
    description: 'Message de clôture final',
    example: 'Merci pour votre excellent travail !',
    required: false,
  })
  @IsString()
  @IsOptional()
  closingMessage?: string;
}
