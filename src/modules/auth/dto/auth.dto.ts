import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  ValidateIf,
  Length,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole as PrismaUserRole } from '@prisma/client';

export enum UserRole {
  USER = 'USER',
  PRO = 'PRO',
  ADMIN = 'ADMIN',
}

export class SignupDto {
  @ApiProperty({ description: 'Adresse email', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Mot de passe (min 6 caractères)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: "Rôle de l'utilisateur",
    enum: UserRole,
    required: false,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ description: 'Prénom (obligatoire pour PRO)', required: false, example: 'Jean' })
  @ValidateIf(o => o.role === UserRole.PRO)
  @IsString()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @ValidateIf(o => o.role !== UserRole.PRO)
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Nom (obligatoire pour PRO)', required: false, example: 'Dupont' })
  @ValidateIf(o => o.role === UserRole.PRO)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @ValidateIf(o => o.role !== UserRole.PRO)
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Numéro de téléphone',
    required: false,
    example: '+33612345678',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: "Nom de l'entreprise (optionnel)",
    required: false,
    example: 'ACME Corp',
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({
    description: 'Numéro SIRET (pour les PRO)',
    required: false,
    example: '12345678901234',
  })
  @IsString()
  @IsOptional()
  siret?: string;

  @ApiProperty({
    description: 'Code pays ISO 3166-1 alpha-2 (obligatoire pour USER)',
    required: false,
    example: 'FR',
  })
  @ValidateIf(o => !o.role || o.role === UserRole.USER)
  @IsString({ message: 'Le code pays doit être une chaîne de caractères' })
  @Length(2, 2, { message: 'Le code pays doit être au format ISO (2 lettres)' })
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'Codes pays ISO 3166-1 alpha-2 (obligatoire pour PRO, minimum 1 pays)',
    required: false,
    example: ['FR', 'DE', 'BE'],
    type: [String],
  })
  @ValidateIf(o => o.role === UserRole.PRO)
  @IsArray({ message: 'Les pays doivent être fournis sous forme de tableau' })
  @ArrayMinSize(1, { message: 'Au moins un pays doit être sélectionné pour un compte PRO' })
  @IsString({ each: true, message: 'Chaque code pays doit être une chaîne de caractères' })
  countries?: string[];
}

export class LoginDto {
  @ApiProperty({ description: 'Adresse email', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Mot de passe', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

class ProfileInAuthResponse {
  @ApiProperty({ description: 'Identifiant du profil' })
  id!: string;

  @ApiProperty({ description: 'Adresse email' })
  email!: string;

  @ApiProperty({ description: 'Rôle', enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'Prénom', required: false })
  firstName?: string;

  @ApiProperty({ description: 'Nom', required: false })
  lastName?: string;

  @ApiProperty({ description: 'Téléphone', required: false })
  phone?: string;

  @ApiProperty({ description: "Nom de l'entreprise", required: false })
  companyName?: string;

  @ApiProperty({ description: 'SIRET', required: false })
  siret?: string;

  @ApiProperty({ description: 'Compte actif' })
  isActive!: boolean;

  @ApiProperty({ description: 'Compte vérifié' })
  isVerified!: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: "Token JWT d'accès",
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({ description: 'Token de rafraîchissement' })
  refresh_token!: string;

  @ApiProperty({ description: 'Type de token', example: 'bearer' })
  token_type!: string;

  @ApiProperty({ description: 'Durée de validité en secondes', example: 3600 })
  expires_in!: number;

  @ApiProperty({
    description: 'Profil utilisateur',
    type: ProfileInAuthResponse,
  })
  profile!: ProfileInAuthResponse;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de rafraîchissement (optionnel, lu depuis le cookie en priorité)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @IsString()
  @IsOptional()
  refresh_token?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Adresse email', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de réinitialisation',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'Nouveau mot de passe (min 6 caractères)',
    example: 'newPassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Ancien mot de passe',
    example: 'oldPassword123',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    description: 'Nouveau mot de passe (min 6 caractères)',
    example: 'newPassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}

export class UpdateEmailDto {
  @ApiProperty({
    description: 'Nouvelle adresse email',
    example: 'newemail@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Mot de passe actuel pour confirmation',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message de réponse',
    example: 'Opération réussie',
  })
  message!: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: "Nouveau token JWT d'accès",
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({ description: 'Type de token', example: 'bearer' })
  token_type!: string;

  @ApiProperty({ description: 'Durée de validité en secondes', example: 3600 })
  expires_in!: number;
}

export class OAuthUrlResponseDto {
  @ApiProperty({
    description: 'URL de redirection OAuth',
    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  })
  url!: string;

  @ApiProperty({
    description: 'Provider OAuth',
    example: 'google',
    enum: ['google', 'github'],
  })
  provider!: string;
}

export class CheckEmailDto {
  @ApiProperty({
    description: 'Adresse email à vérifier',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class CheckEmailResponseDto {
  @ApiProperty({
    description: 'Indique si l\'email existe',
    example: true,
  })
  exists!: boolean;

  @ApiProperty({
    description: 'Email vérifié',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Rôle de l\'utilisateur si le compte existe',
    enum: ['USER', 'PRO', 'ADMIN'],
    required: false,
    example: 'USER',
  })
  role?: PrismaUserRole;
}
