import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export class CreateDistributionDto {
  @ApiProperty({
    description: 'Jour de la semaine (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Nombre maximum d\'unités disponibles ce jour',
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  maxUnits!: number;

  @ApiProperty({
    description: 'Distribution active?',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
