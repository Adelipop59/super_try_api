import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider } from './notification-provider.interface';

/**
 * Provider pour les notifications par SMS
 *
 * TODO: Implémenter avec un vrai service SMS (Twilio, AWS SNS, etc.)
 *
 * Exemple d'intégration avec Twilio:
 * 1. npm install twilio
 * 2. Configurer TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER dans .env
 * 3. Remplacer le mock ci-dessous
 */
@Injectable()
export class SmsProvider implements INotificationProvider {
  private readonly logger = new Logger(SmsProvider.name);

  async send(
    to: string, // Phone number (format E.164: +33612345678)
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    try {
      // TODO: Remplacer par l'envoi réel de SMS
      this.logger.log(`[SMS MOCK] Envoi à ${to}`);
      this.logger.log(`[SMS MOCK] Message: ${title} - ${message}`);
      if (data) {
        this.logger.log(`[SMS MOCK] Data: ${JSON.stringify(data)}`);
      }

      // Simuler un délai réseau
      await new Promise((resolve) => setTimeout(resolve, 100));

      /*
      // Exemple avec Twilio:
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        body: `${title}\n\n${message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      */

      return true; // Succès
    } catch (error) {
      this.logger.error(`[SMS] Erreur d'envoi: ${error.message}`);
      return false;
    }
  }
}
