import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { LogsModule } from './modules/logs/logs.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { StepsModule } from './modules/steps/steps.module';
import { DistributionsModule } from './modules/distributions/distributions.module';
import { TestingModule } from './modules/testing/testing.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
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

    // Global modules
    PrismaModule,
    SupabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CampaignsModule,
    LogsModule,
    ProceduresModule,
    StepsModule,
    DistributionsModule,
    SessionsModule,
    MessagesModule,
    NotificationsModule,
    AdminModule,
    TestingModule,
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
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
