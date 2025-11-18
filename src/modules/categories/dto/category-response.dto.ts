import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ description: 'ID de la catégorie' })
  id!: string;

  @ApiProperty({ description: 'Nom de la catégorie' })
  name!: string;

  @ApiProperty({ description: 'Slug URL-friendly' })
  slug!: string;

  @ApiProperty({ description: 'Description', required: false })
  description?: string | null;

  @ApiProperty({ description: 'Icône/emoji', required: false })
  icon?: string | null;

  @ApiProperty({ description: 'Catégorie active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Nombre de produits dans cette catégorie', required: false })
  productCount?: number;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
