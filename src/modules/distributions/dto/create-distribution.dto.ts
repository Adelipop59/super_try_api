import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsDate,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DistributionType } from '@prisma/client';

export class CreateDistributionDto {
  @ApiProperty({
    description: 'Type de distribution',
    enum: DistributionType,
    example: DistributionType.RECURRING,
  })
  @IsEnum(DistributionType)
  type!: DistributionType;

  @ApiProperty({
    description:
      'Jour de la semaine (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi). Requis pour type RECURRING, ignoré pour SPECIFIC_DATE.',
    example: 1,
    minimum: 0,
    maximum: 6,
    required: false,
  })
  @ValidateIf((o) => o.type === DistributionType.RECURRING)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({
    description:
      'Date spécifique pour la distribution. Requise pour type SPECIFIC_DATE, ignorée pour RECURRING.',
    example: '2025-11-15T00:00:00.000Z',
    required: false,
  })
  @ValidateIf((o) => o.type === DistributionType.SPECIFIC_DATE)
  @IsDate()
  @Type(() => Date)
  specificDate?: Date;

  @ApiProperty({
    description: 'Distribution active?',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
