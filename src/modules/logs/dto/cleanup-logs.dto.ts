import { IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CleanupLogsDto {
  @ApiPropertyOptional({
    description: 'Supprimer les logs plus anciens que X jours',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  olderThanDays?: number;

  @ApiPropertyOptional({
    description: 'Supprimer les logs avant cette date (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  beforeDate?: string;
}
