import { ApiProperty } from '@nestjs/swagger';

export class CampaignCriteriaResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  campaignId!: string;

  @ApiProperty({ example: 18, required: false })
  minAge?: number | null;

  @ApiProperty({ example: 65, required: false })
  maxAge?: number | null;

  @ApiProperty({ example: 3.0, required: false })
  minRating?: number | null;

  @ApiProperty({ example: 5.0, required: false })
  maxRating?: number | null;

  @ApiProperty({ example: 5, required: false })
  minCompletedSessions?: number | null;

  @ApiProperty({ example: 'ALL', required: false })
  requiredGender?: string | null;

  @ApiProperty({
    example: ['Paris', 'Lyon'],
    type: [String],
  })
  requiredLocations!: string[];

  @ApiProperty({
    example: ['uuid-cat-1'],
    type: [String],
  })
  requiredCategories!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
