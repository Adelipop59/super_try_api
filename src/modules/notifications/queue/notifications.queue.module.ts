import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsQueueProcessor } from './notifications.queue.processor';
import { NotificationsQueueService } from './notifications.queue.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { PushProvider } from '../providers/push.provider';
import { TemplateService } from '../templates/template.service';

/**
 * Module de gestion de la queue des notifications
 * Utilise BullMQ + Redis pour le traitement asynchrone
 */
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      name: 'notifications',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          maxRetriesPerRequest: null, // Required for BullMQ
        },
        defaultJobOptions: {
          attempts: 3, // Max 3 tentatives
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s
          },
          removeOnComplete: {
            age: 24 * 3600, // Garde les jobs complétés 24h
            count: 1000, // Max 1000 jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Garde les jobs échoués 7 jours
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    NotificationsQueueProcessor,
    NotificationsQueueService,
    EmailProvider,
    SmsProvider,
    PushProvider,
    TemplateService,
  ],
  exports: [NotificationsQueueService],
})
export class NotificationsQueueModule {}
