import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider } from './notification-provider.interface';

/**
 * Provider pour les notifications par Email
 *
 * TODO: Implémenter avec un vrai service d'email (SendGrid, AWS SES, Nodemailer, etc.)
 *
 * Exemple d'intégration avec SendGrid:
 * 1. npm install @sendgrid/mail
 * 2. Configurer SENDGRID_API_KEY dans .env
 * 3. Remplacer le mock ci-dessous
 */
@Injectable()
export class EmailProvider implements INotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);

  async send(
    to: string, // Email address
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    try {
      // TODO: Remplacer par l'envoi réel d'email
      this.logger.log(`[EMAIL MOCK] Envoi à ${to}`);
      this.logger.log(`[EMAIL MOCK] Titre: ${title}`);
      this.logger.log(`[EMAIL MOCK] Message: ${message}`);
      if (data) {
        this.logger.log(`[EMAIL MOCK] Data: ${JSON.stringify(data)}`);
      }

      // Simuler un délai réseau
      await new Promise((resolve) => setTimeout(resolve, 100));

      /*
      // Exemple avec SendGrid:
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to,
        from: 'noreply@supertry.com',
        subject: title,
        text: message,
        html: `<p>${message}</p>`,
      };

      await sgMail.send(msg);
      */

      return true; // Succès
    } catch (error) {
      this.logger.error(`[EMAIL] Erreur d'envoi: ${error.message}`);
      return false;
    }
  }
}
