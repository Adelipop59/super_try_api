import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BonusTaskType } from '@prisma/client';

export class CreateBonusTaskDto {
  @IsEnum(BonusTaskType)
  @IsNotEmpty()
  type!: BonusTaskType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  reward!: number; // Montant de la récompense pour cette prestation
}
