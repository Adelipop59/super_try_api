import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { LogsModule } from './modules/logs/logs.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { ProcedureTemplatesModule } from './modules/procedure-templates/procedure-templates.module';
import { CriteriaTemplatesModule } from './modules/criteria-templates/criteria-templates.module';
import { StepsModule } from './modules/steps/steps.module';
import { DistributionsModule } from './modules/distributions/distributions.module';
import { TestingModule } from './modules/testing/testing.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BonusTasksModule } from './modules/bonus-tasks/bonus-tasks.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { UploadModule } from './modules/upload/upload.module';
import { ChatOrdersModule } from './modules/chat-orders/chat-orders.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { KycVerifiedGuard } from './common/guards/kyc-verified.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: '.env',
    }),

    // BullMQ Queue system (global)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),

    // Schedule module for cron jobs (global)
    ScheduleModule.forRoot(),

    // Global modules
    PrismaModule,
    SupabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CampaignsModule,
    LogsModule,
    ProceduresModule,
    ProcedureTemplatesModule,
    CriteriaTemplatesModule,
    StepsModule,
    DistributionsModule,
    SessionsModule,
    MessagesModule,
    NotificationsModule,
    AdminModule,
    TestingModule,
    ReviewsModule,
    BonusTasksModule,
    WalletsModule,
    UploadModule,
    ChatOrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global KYC verification guard
    {
      provide: APP_GUARD,
      useClass: KycVerifiedGuard,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
