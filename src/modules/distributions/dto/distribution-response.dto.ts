import { ApiProperty } from '@nestjs/swagger';
import { DistributionType } from '@prisma/client';

export class DistributionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  campaignId!: string;

  @ApiProperty({
    enum: DistributionType,
    example: DistributionType.RECURRING,
    description: 'Type de distribution (RECURRING ou SPECIFIC_DATE)',
  })
  type!: DistributionType;

  @ApiProperty({
    example: 1,
    description:
      '0 = Dimanche, 1 = Lundi, ..., 6 = Samedi (null si SPECIFIC_DATE)',
    nullable: true,
  })
  dayOfWeek?: number | null;

  @ApiProperty({
    example: 'Lundi',
    description: 'Nom du jour en français (null si SPECIFIC_DATE)',
    nullable: true,
  })
  dayName?: string | null;

  @ApiProperty({
    example: '2025-11-15T00:00:00.000Z',
    description: 'Date spécifique (null si RECURRING)',
    nullable: true,
  })
  specificDate?: Date | null;

  @ApiProperty({
    example: 10,
    description: 'Nombre maximum d\'unités à distribuer pour ce jour',
  })
  maxUnits!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;
}
