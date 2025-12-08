import { IsUrl, IsNotEmpty, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductImageDto {
  @ApiProperty({
    description: 'URL de l\'image',
    example: 'https://super-try-images.s3.eu-west-3.amazonaws.com/products/123/image.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Ordre d\'affichage de l\'image',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  order!: number;

  @ApiProperty({
    description: 'Image principale du produit',
    example: true,
  })
  @IsBoolean()
  isPrimary!: boolean;
}
