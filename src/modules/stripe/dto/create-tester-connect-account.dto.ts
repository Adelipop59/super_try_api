import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTesterConnectAccountDto {
  @ApiProperty({
    description: 'URL de retour après onboarding réussi',
    example: 'https://app.super-try.com/profile/stripe-success',
  })
  @IsNotEmpty()
  @IsString()
  returnUrl: string;

  @ApiProperty({
    description: 'URL de rafraîchissement si onboarding échoue',
    example: 'https://app.super-try.com/profile/stripe-refresh',
  })
  @IsNotEmpty()
  @IsString()
  refreshUrl: string;

  @ApiProperty({
    description: 'Code pays (ISO 3166-1 alpha-2)',
    example: 'FR',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description: 'Type de compte',
    enum: ['individual', 'company'],
    default: 'individual',
    required: false,
  })
  @IsOptional()
  @IsEnum(['individual', 'company'])
  businessType?: 'individual' | 'company';
}
