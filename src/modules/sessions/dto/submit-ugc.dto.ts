import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UGCType } from './ugc-request.dto';

export class UGCSubmissionItem {
  @ApiProperty({
    description: 'Type de contenu UGC',
    enum: UGCType,
    example: UGCType.VIDEO,
  })
  @IsEnum(UGCType)
  type!: UGCType;

  @ApiProperty({
    description: 'URL du contenu soumis (lien vers fichier uploadé)',
    example: 'https://storage.supabase.co/ugc/video123.mp4',
  })
  @IsString()
  @IsNotEmpty()
  contentUrl!: string;

  @ApiProperty({
    description: 'Description ou commentaire du testeur',
    example: 'Vidéo TikTok montrant le produit en action',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class SubmitUGCDto {
  @ApiProperty({
    description: 'Liste des contenus UGC soumis',
    type: [UGCSubmissionItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UGCSubmissionItem)
  ugcSubmissions!: UGCSubmissionItem[];

  @ApiProperty({
    description: 'Message optionnel pour le vendeur',
    example: 'Voici les contenus demandés',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;
}
