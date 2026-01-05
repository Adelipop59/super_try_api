import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UGCType {
  VIDEO = 'VIDEO',
  PHOTO = 'PHOTO',
  TEXT_REVIEW = 'TEXT_REVIEW',
  EXTERNAL_REVIEW = 'EXTERNAL_REVIEW', // Avis sur site externe (Amazon, Google, etc.)
}

export class UGCRequestItem {
  @ApiProperty({
    description: 'Type de contenu UGC demandé',
    enum: UGCType,
    example: UGCType.VIDEO,
  })
  @IsEnum(UGCType)
  type!: UGCType;

  @ApiProperty({
    description: 'Description de ce qui est attendu',
    example: 'Vidéo de 30 secondes pour TikTok montrant le produit en action',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @ApiProperty({
    description: 'Bonus financier pour cette tâche (en €)',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Le bonus doit être positif' })
  bonus!: number;

  @ApiProperty({
    description: 'Date limite de soumission (optionnel)',
    example: '2025-01-15T00:00:00Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  deadline?: string;
}

export class ValidateAndRequestUGCDto {
  @ApiProperty({
    description: 'Liste des contenus UGC demandés',
    type: [UGCRequestItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UGCRequestItem)
  ugcRequests!: UGCRequestItem[];

  @ApiProperty({
    description: 'Note du testeur (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  rating!: number;

  @ApiProperty({
    description: 'Commentaire de notation',
    example: 'Excellent travail, test très détaillé',
    required: false,
  })
  @IsString()
  @IsOptional()
  ratingComment?: string;
}
