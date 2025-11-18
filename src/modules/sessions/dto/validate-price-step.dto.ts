import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ValidatePriceStepDto {
  @ApiProperty({
    description: 'Prix trouvé et saisi par le testeur',
    example: 1199.0,
  })
  @IsNumber()
  @Min(0)
  price!: number;
}
