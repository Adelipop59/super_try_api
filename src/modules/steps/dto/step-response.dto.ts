import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepType } from '@prisma/client';

export class StepResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  procedureId!: string;

  @ApiProperty({ example: 'Prendre une photo du produit' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Prenez une photo claire du produit sous plusieurs angles',
  })
  description?: string | null;

  @ApiProperty({ enum: StepType, example: StepType.PHOTO })
  type!: StepType;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: true })
  isRequired!: boolean;

  @ApiPropertyOptional({
    example: ['Item 1', 'Item 2', 'Item 3'],
    type: [String],
  })
  checklistItems?: string[] | null;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;
}
