import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * DTO pour créer un profil utilisateur
 * Utilisé par le module Auth lors du signup et OAuth
 */
export class CreateProfileDto {
  @ApiProperty({
    description: "ID de l'utilisateur Supabase",
    example: 'uuid-from-supabase',
  })
  @IsUUID()
  supabaseUserId: string;

  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Rôle de l'utilisateur",
    enum: UserRole,
    example: UserRole.USER,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    description: 'Prénom',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Numéro de téléphone',
    example: '+33612345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: "URL de l'avatar",
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: "Nom de l'entreprise (facultatif pour PRO)",
    example: 'Acme Corp',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiProperty({
    description: 'Numéro SIRET (facultatif pour PRO)',
    example: '12345678901234',
    required: false,
  })
  @IsString()
  @IsOptional()
  siret?: string;

  @ApiProperty({
    description: 'Code pays ISO 3166-1 alpha-2',
    example: 'FR',
    required: false,
  })
  @IsString()
  @Length(2, 2)
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'Provider OAuth utilisé (google, azure, github, etc.)',
    example: 'azure',
    required: false,
  })
  @IsString()
  @IsOptional()
  authProvider?: string;

  @ApiProperty({
    description: "Indique si l'utilisateur a complété son onboarding (OAuth)",
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isOnboarded?: boolean;
}
