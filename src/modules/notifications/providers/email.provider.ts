import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { INotificationProvider } from './notification-provider.interface';
import { TemplateService } from '../templates/template.service';

/**
 * Provider d'envoi d'emails via SendGrid
 * Supporte les templates Handlebars
 */
@Injectable()
export class EmailProvider implements INotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly isConfigured: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private configService: ConfigService,
    private templateService: TemplateService,
  ) {
    const apiKey = this.configService.get<string>(
      'notifications.sendgrid.apiKey',
    );
    this.fromEmail =
      this.configService.get<string>('notifications.sendgrid.fromEmail') ||
      'noreply@supertry.com';
    this.fromName =
      this.configService.get<string>('notifications.sendgrid.fromName') ||
      'Super Try';

    if (apiKey && apiKey !== 'SG.your_sendgrid_api_key') {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('✅ SendGrid Email Provider initialized');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        '⚠️  SendGrid API key not configured - emails will only be logged',
      );
    }
  }

  /**
   * Envoie un email
   * Si data.template est fourni, utilise un template Handlebars
   * Sinon, envoie le message brut en HTML
   */
  async send(
    to: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean> {
    try {
      let emailContent: { subject: string; html: string; text: string };

      // Si un template est spécifié, l'utiliser
      if (data?.template) {
        this.logger.log(`Rendering email template: ${data.template}`);
        emailContent = await this.templateService.renderEmail(data.template, {
          subject: title,
          ...data.templateVars,
          currentYear: new Date().getFullYear(),
        });
      } else {
        // Sinon, utiliser le message brut
        emailContent = {
          subject: title,
          html: this.wrapInBasicLayout(title, message),
          text: message,
        };
      }

      const mailOptions = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      };

      if (!this.isConfigured) {
        this.logger.warn('📧 [MOCK] Email would be sent:');
        this.logger.warn(`   To: ${to}`);
        this.logger.warn(`   Subject: ${emailContent.subject}`);
        this.logger.warn(`   Template: ${data?.template || 'none'}`);
        return true;
      }

      const result = await sgMail.send(mailOptions);

      if (result && result[0]?.statusCode === 202) {
        this.logger.log(`✅ Email sent successfully to ${to}`);
        return true;
      } else {
        this.logger.error(
          `❌ Email send failed with status: ${result[0]?.statusCode}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error.message);

      // Log l'erreur SendGrid si disponible
      if (error.response?.body?.errors) {
        this.logger.error(
          'SendGrid error details:',
          JSON.stringify(error.response.body.errors),
        );
      }

      return false;
    }
  }

  /**
   * Wrapper HTML basique pour les emails sans template
   */
  private wrapInBasicLayout(title: string, message: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Super Try</h1>
  </div>
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2>${title}</h2>
    <div>${message}</div>
  </div>
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
    <p>&copy; ${new Date().getFullYear()} Super Try. Tous droits réservés.</p>
  </div>
</body>
</html>
    `.trim();
  }
}
