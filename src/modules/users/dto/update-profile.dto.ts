import { IsString, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  USER = 'USER',
  PRO = 'PRO',
  ADMIN = 'ADMIN',
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'Prénom', required: false, minLength: 2, example: 'Jean' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  firstName?: string;

  @ApiProperty({ description: 'Nom', required: false, minLength: 2, example: 'Dupont' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  lastName?: string;

  @ApiProperty({ description: 'Numéro de téléphone', required: false, example: '+33612345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'URL de l\'avatar', required: false, example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Nom de l\'entreprise (PRO)', required: false, example: 'ACME Corp' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({ description: 'Numéro SIRET (PRO)', required: false, example: '12345678901234' })
  @IsString()
  @IsOptional()
  siret?: string;

  @ApiProperty({ description: 'Rôle (Admin uniquement)', enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ description: 'Statut actif (Admin uniquement)', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Compte vérifié (Admin uniquement)', required: false })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
