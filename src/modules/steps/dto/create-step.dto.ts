import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { StepType } from '@prisma/client';

export class CreateStepDto {
  @ApiProperty({
    description: "Titre de l'étape",
    example: 'Prendre une photo du produit',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: "Description détaillée de l'étape",
    example: 'Prenez une photo claire du produit sous plusieurs angles',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Type d'étape",
    enum: StepType,
    example: StepType.PHOTO,
  })
  @IsEnum(StepType)
  type!: StepType;

  @ApiProperty({
    description: "Ordre d'exécution",
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({
    description: 'Cette étape est-elle obligatoire?',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = true;

  @ApiPropertyOptional({
    description: 'Items de la checklist (seulement pour type CHECKLIST)',
    example: ['Item 1', 'Item 2', 'Item 3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  checklistItems?: string[];
}
