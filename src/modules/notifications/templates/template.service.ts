import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service de gestion des templates email
 * Utilise Handlebars pour le templating
 */
@Injectable()
export class TemplateService {
  private readonly templatesCache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templatesPath = path.join(__dirname, 'email');

  constructor() {
    this.registerHelpers();
  }

  /**
   * Compile et rend un template email
   */
  async renderEmail(
    templateName: string,
    variables: Record<string, any>,
  ): Promise<{ subject: string; html: string; text: string }> {
    const template = await this.getTemplate(templateName);

    const html = template(variables);

    // Génère une version texte simple (sans HTML)
    const text = this.stripHtml(html);

    // Extrait le subject du template (première ligne avec {{subject}})
    const subject = variables.subject || 'Notification - Super Try';

    return { subject, html, text };
  }

  /**
   * Récupère un template compilé (avec cache)
   */
  private async getTemplate(templateName: string): Promise<Handlebars.TemplateDelegate> {
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateContent);

    this.templatesCache.set(templateName, compiled);

    return compiled;
  }

  /**
   * Enregistre les helpers Handlebars personnalisés
   */
  private registerHelpers() {
    // Helper pour formater les dates
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    });

    // Helper pour formater les montants
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    });

    // Helper pour les URLs
    Handlebars.registerHelper('url', (path: string) => {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return `${baseUrl}${path}`;
    });
  }

  /**
   * Supprime les balises HTML pour version texte
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s\s+/g, ' ')
      .trim();
  }
}
