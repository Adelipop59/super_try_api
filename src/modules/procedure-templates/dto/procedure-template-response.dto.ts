import { ApiProperty } from '@nestjs/swagger';
import { StepType } from '@prisma/client';

export class StepTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty({ enum: StepType })
  type!: StepType;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty({ required: false })
  checklistItems?: any;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProcedureTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sellerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [StepTemplateResponseDto] })
  steps!: StepTemplateResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
