import { IsEnum, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SessionStatus } from '@prisma/client';

/**
 * DTO pour filtrer les sessions de test
 */
export class SessionFilterDto {
  @ApiProperty({
    description: 'Filtrer par statut',
    enum: SessionStatus,
    required: false,
  })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiProperty({
    description: 'Filtrer par campagne',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @ApiProperty({
    description: 'Filtrer par testeur',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  testerId?: string;

  @ApiProperty({
    description: 'Nombre de résultats par page',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

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
