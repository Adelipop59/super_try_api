import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: configService.get('frontend.url') || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert primitive types automatically
      },
    }),
  );

  // API prefix with versioning
  app.setGlobalPrefix('api/v1');

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Super Try API')
    .setDescription(
      'API pour la plateforme Super Try - Mise en relation vendeurs et testeurs de produits',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Token JWT Supabase',
        in: 'header',
      },
      'supabase-auth',
    )
    .addTag('app', 'Endpoints racine et health check')
    .addTag('auth', "Endpoints d'authentification")
    .addTag('users', 'Gestion des utilisateurs et profils')
    .addTag('products', 'Gestion des produits')
    .addTag('campaigns', 'Gestion des campagnes de test')
    .addTag('logs', 'Logs système (ADMIN uniquement)')
    .addTag('test_procedures', 'Procédures de test pour les campagnes')
    .addTag('test_steps', 'Étapes détaillées des procédures de test')
    .addTag('distributions', 'Planning de distribution des tests par jour')
    .addTag('test_api', 'Endpoints de test pour créer/supprimer des données fictives (DEV)')
    .addTag('testing_sessions', 'Sessions de test actives')
    .addTag('messages', 'Messagerie entre vendeurs et testeurs')
    .addTag('notifications', 'Notifications utilisateurs')
    .addTag('admin', 'Panel d\'administration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/api/v1/docs`,
  );
  logger.log(`Environment: ${configService.get('nodeEnv')}`);
}

bootstrap();
