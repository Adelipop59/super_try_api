import { ApiProperty } from '@nestjs/swagger';

export class StepInfoDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Rechercher le produit sur Amazon' })
  title!: string;

  @ApiProperty({ example: 'TEXT' })
  type!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: true })
  isRequired!: boolean;

  @ApiProperty({
    example: 'Allez sur Amazon.fr et recherchez "iPhone 15 Pro"',
    required: false,
  })
  description?: string | null;
}

export class SessionStepProgressResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  sessionId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  stepId!: string;

  @ApiProperty({ type: StepInfoDto })
  step!: StepInfoDto;

  @ApiProperty({ example: false })
  isCompleted!: boolean;

  @ApiProperty({ required: false })
  completedAt?: Date | null;

  @ApiProperty({
    example: { photos: ['url1'], text: 'Ma réponse' },
    required: false,
  })
  submissionData?: any | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
