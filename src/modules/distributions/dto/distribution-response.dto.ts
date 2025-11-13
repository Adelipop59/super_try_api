import { ApiProperty } from '@nestjs/swagger';

export class DistributionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  campaignId!: string;

  @ApiProperty({
    example: 1,
    description: '0 = Dimanche, 1 = Lundi, ..., 6 = Samedi',
  })
  dayOfWeek!: number;

  @ApiProperty({
    example: 'Lundi',
    description: 'Nom du jour en français',
  })
  dayName!: string;

  @ApiProperty({ example: 5 })
  maxUnits!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;
}
