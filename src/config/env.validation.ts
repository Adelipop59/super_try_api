import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { plainToClass } from 'class-transformer';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // Supabase
  @IsString()
  @IsNotEmpty()
  SUPABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_KEY!: string;

  // Database
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  DIRECT_URL!: string;

  // JWT
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  // App
  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  // Stripe
  @IsString()
  @IsNotEmpty()
  STRIPE_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PUBLIC_KEY!: string;

  // Admin
  @IsString()
  @IsNotEmpty()
  ADMIN_SECRET_CODE!: string;

  // Frontend
  @IsString()
  @IsNotEmpty()
  FRONTEND_URL!: string;

  // Firebase (optional, for notifications)
  @IsString()
  @IsOptional()
  FIREBASE_CONFIG?: string;

  // Redis (optional)
  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  return validatedConfig;
}
