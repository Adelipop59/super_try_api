import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { INotificationProvider } from './notification-provider.interface';

/**
 * Provider pour les notifications Push via Firebase Cloud Messaging
 */
@Injectable()
export class PushProvider implements INotificationProvider {
  private readonly logger = new Logger(PushProvider.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const firebaseConfigString = this.configService.get<string>('notifications.firebase.config');

    try {
      if (firebaseConfigString && firebaseConfigString !== '{}' && !firebaseConfigString.includes('your-project-id')) {
        const firebaseConfig = JSON.parse(firebaseConfigString);

        // Initialiser Firebase Admin SDK (singleton)
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
          });
        }

        this.isConfigured = true;
        this.logger.log('✅ Firebase Cloud Messaging Provider initialized');
      } else {
        this.isConfigured = false;
        this.logger.warn('⚠️  Firebase config not set - Push notifications will only be logged');
      }
    } catch (error) {
      this.isConfigured = false;
      this.logger.error(`❌ Failed to initialize Firebase: ${error.message}`);
      this.logger.warn('⚠️  Push notifications will only be logged');
    }
  }

  /**
   * Envoie une notification push
   * @param to Device token (FCM token)
   * @param title Titre de la notification
   * @param message Corps de la notification
   * @param data Données additionnelles (optionnel)
   */
  async send(to: string, title: string, message: string, data?: any): Promise<boolean> {
    try {
      // Valider le device token
      if (!to || to.length < 10) {
        this.logger.error(`Invalid device token: ${to}`);
        return false;
      }

      if (!this.isConfigured) {
        this.logger.warn('🔔 [MOCK] Push notification would be sent:');
        this.logger.warn(`   To: ${to.substring(0, 20)}...`);
        this.logger.warn(`   Title: ${title}`);
        this.logger.warn(`   Message: ${message}`);
        if (data) {
          this.logger.warn(`   Data: ${JSON.stringify(data)}`);
        }
        return true;
      }

      // Construire le payload FCM
      const payload: admin.messaging.Message = {
        token: to,
        notification: {
          title,
          body: message,
        },
        // Données personnalisées (accessible dans l'app)
        data: data
          ? Object.keys(data).reduce((acc, key) => {
              // FCM requiert que toutes les valeurs soient des strings
              acc[key] = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
              return acc;
            }, {} as Record<string, string>)
          : undefined,
        // Options Android
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'super-try-notifications',
          },
        },
        // Options iOS (APNs)
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const result = await admin.messaging().send(payload);

      this.logger.log(`✅ Push notification sent successfully (MessageID: ${result})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send push notification to ${to}:`, error.message);

      // Log erreur FCM spécifique
      if (error.code) {
        this.logger.error(`FCM error code: ${error.code}`);
      }

      // Erreurs courantes
      if (error.code === 'messaging/invalid-registration-token') {
        this.logger.warn('Device token is invalid or expired');
      } else if (error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn('Device token is not registered');
      }

      return false;
    }
  }

  /**
   * Envoie une notification push à plusieurs appareils (multicast)
   * Utile pour les broadcasts
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    message: string,
    data?: any,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isConfigured) {
      this.logger.warn(`🔔 [MOCK] Multicast push would be sent to ${tokens.length} devices`);
      return { successCount: tokens.length, failureCount: 0 };
    }

    try {
      const payload: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body: message,
        },
        data: data
          ? Object.keys(data).reduce((acc, key) => {
              acc[key] = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
              return acc;
            }, {} as Record<string, string>)
          : undefined,
      };

      const result = await admin.messaging().sendEachForMulticast(payload);

      this.logger.log(
        `✅ Multicast sent: ${result.successCount} success, ${result.failureCount} failures`,
      );

      // Log les tokens en échec
      if (result.failureCount > 0) {
        result.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.warn(`Failed to send to token ${idx}: ${resp.error?.message}`);
          }
        });
      }

      return {
        successCount: result.successCount,
        failureCount: result.failureCount,
      };
    } catch (error) {
      this.logger.error('❌ Multicast send failed:', error.message);
      return { successCount: 0, failureCount: tokens.length };
    }
  }
}
