import { IsEmail, IsEnum, IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  USER = 'USER',
  PRO = 'PRO',
  ADMIN = 'ADMIN',
}

export class ProfileResponseDto {
  @ApiProperty({ description: 'Identifiant unique du profil', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Identifiant Supabase de l\'utilisateur', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  supabaseUserId!: string;

  @ApiProperty({ description: 'Adresse email', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Rôle de l\'utilisateur', enum: UserRole, example: UserRole.USER })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ description: 'Prénom', required: false, example: 'Jean' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Nom', required: false, example: 'Dupont' })
  @IsString()
  @IsOptional()
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

  @ApiProperty({ description: 'Compte actif', example: true })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ description: 'Compte vérifié', example: false })
  @IsBoolean()
  isVerified!: boolean;

  @ApiProperty({ description: 'Date de création', example: '2024-01-10T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de dernière mise à jour', example: '2024-01-10T10:00:00Z' })
  updatedAt!: Date;
}
