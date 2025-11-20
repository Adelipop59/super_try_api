import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  IsInt,
  Min,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StepType } from '@prisma/client';

/**
 * DTO pour créer une étape de template
 */
export class CreateStepTemplateDto {
  @ApiProperty({
    description: "Titre de l'étape",
    example: 'Prendre une photo du produit',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: "Description détaillée de l'étape",
    example: 'Prenez une photo claire du produit déballé',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Type de l'étape",
    enum: StepType,
    default: StepType.TEXT,
  })
  @IsEnum(StepType)
  @IsOptional()
  type?: StepType;

  @ApiProperty({
    description: "Ordre de l'étape dans la procédure",
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({
    description: "L'étape est-elle obligatoire ?",
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({
    description: 'Éléments de checklist (pour type CHECKLIST)',
    required: false,
    example: ['Vérifier emballage', 'Vérifier accessoires'],
  })
  @IsArray()
  @IsOptional()
  checklistItems?: string[];
}

/**
 * DTO pour créer un template de procédure
 */
export class CreateProcedureTemplateDto {
  @ApiProperty({
    description: 'Nom du template (pour identifier le template)',
    example: 'Procédure standard smartphone',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({
    description: 'Titre de la procédure (sera copié dans les campagnes)',
    example: 'Test complet du produit',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title!: string;

  @ApiProperty({
    description: 'Description de la procédure',
    example:
      'Cette procédure vous guidera à travers toutes les étapes de test du produit.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @ApiProperty({
    description: 'Étapes du template',
    type: [CreateStepTemplateDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStepTemplateDto)
  @IsOptional()
  steps?: CreateStepTemplateDto[];
}
