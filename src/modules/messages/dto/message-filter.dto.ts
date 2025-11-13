import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO pour filtrer les messages
 */
export class MessageFilterDto {
  @ApiProperty({
    description: 'Filtrer par statut de lecture',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiProperty({
    description: 'Nombre de résultats par page',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @ApiProperty({
    description: 'Page (offset)',
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}
