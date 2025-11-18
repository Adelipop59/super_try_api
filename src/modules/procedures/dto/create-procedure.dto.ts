import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateProcedureDto {
  @ApiProperty({
    description: 'Titre de la procédure',
    example: 'Test de déballage du produit',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    description: 'Description détaillée de la procédure',
    example:
      'Le testeur doit déballer le produit, vérifier son état et documenter le processus',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @ApiProperty({
    description: "Ordre d'exécution (priorité)",
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({
    description: 'Cette procédure est-elle obligatoire?',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = true;
}
