import { ApiProperty } from '@nestjs/swagger';

export class ProcedureResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  campaignId!: string;

  @ApiProperty({ example: 'Test de déballage du produit' })
  title!: string;

  @ApiProperty({
    example:
      'Le testeur doit déballer le produit, vérifier son état et documenter le processus',
  })
  description!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: true })
  isRequired!: boolean;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;
}
