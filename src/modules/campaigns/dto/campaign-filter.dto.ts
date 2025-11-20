import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { CampaignStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * DTO pour filtrer les campagnes avec pagination
 */
export class CampaignFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrer par ID du vendeur',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut de la campagne',
    enum: CampaignStatus,
    example: CampaignStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description: 'Date de début minimale (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date de début maximale (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({
    description: 'Seulement les campagnes avec des slots disponibles',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasAvailableSlots?: boolean;
}
