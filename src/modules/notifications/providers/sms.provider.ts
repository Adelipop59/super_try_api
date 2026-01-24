import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { INotificationProvider } from './notification-provider.interface';

/**
 * Provider d'envoi de SMS via Twilio
 * Supporte aussi WhatsApp via Twilio
 */
@Injectable()
export class SmsProvider implements INotificationProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly isConfigured: boolean;
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>(
      'notifications.twilio.accountSid',
    );
    const authToken = this.configService.get<string>(
      'notifications.twilio.authToken',
    );
    this.fromNumber =
      this.configService.get<string>('notifications.twilio.phoneNumber') || '';

    if (
      accountSid &&
      authToken &&
      accountSid !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' &&
      this.fromNumber
    ) {
      this.client = twilio(accountSid, authToken);
      this.isConfigured = true;
      this.logger.log('✅ Twilio SMS Provider initialized');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        '⚠️  Twilio credentials not configured - SMS will only be logged',
      );
    }
  }

  /**
   * Envoie un SMS
   * Format du numéro: E.164 (+33612345678)
   */
  async send(
    to: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    try {
      // Valider le format du numéro
      if (!to.startsWith('+')) {
        this.logger.error(
          `Invalid phone number format: ${to}. Must be E.164 format (+33...)`,
        );
        return false;
      }

      // Construire le message SMS (max 160 caractères recommandé)
      const smsBody = data?.longMessage
        ? `${title}\n\n${message}`
        : this.truncateMessage(title, message);

      if (!this.isConfigured) {
        this.logger.warn('📱 [MOCK] SMS would be sent:');
        this.logger.warn(`   To: ${to}`);
        this.logger.warn(`   Message: ${smsBody}`);
        return true;
      }

      const result = await this.client.messages.create({
        body: smsBody,
        from: this.fromNumber,
        to,
      });

      if (result.sid) {
        this.logger.log(
          `✅ SMS sent successfully to ${to} (SID: ${result.sid})`,
        );
        return true;
      } else {
        this.logger.error(`❌ SMS send failed - no SID returned`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send SMS to ${to}:`, error.message);

      // Log Twilio error details
      if (error.code) {
        this.logger.error(`Twilio error code: ${error.code}`);
      }

      return false;
    }
  }

  /**
   * Tronque le message pour respecter la limite SMS (160 caractères)
   */
  private truncateMessage(title: string, message: string): string {
    const maxLength = 160;
    const fullMessage = `${title}\n${message}`;

    if (fullMessage.length <= maxLength) {
      return fullMessage;
    }

    // Tronquer avec "..." à la fin
    return fullMessage.substring(0, maxLength - 3) + '...';
  }

  /**
   * Envoie un message WhatsApp via Twilio
   * (méthode helper pour faciliter l'usage)
   */
  async sendWhatsApp(
    to: string,
    title: string,
    message: string,
  ): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        this.logger.warn('📱 [MOCK] WhatsApp would be sent:');
        this.logger.warn(`   To: whatsapp:${to}`);
        this.logger.warn(`   Message: ${title}\n${message}`);
        return true;
      }

      const result = await this.client.messages.create({
        body: `${title}\n\n${message}`,
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${to}`,
      });

      if (result.sid) {
        this.logger.log(
          `✅ WhatsApp sent successfully to ${to} (SID: ${result.sid})`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`❌ Failed to send WhatsApp to ${to}:`, error.message);
      return false;
    }
  }
}
