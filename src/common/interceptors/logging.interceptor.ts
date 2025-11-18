import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogsService } from '../../modules/logs/logs.service';
import { LogCategory } from '@prisma/client';

/**
 * Intercepteur global pour logger automatiquement toutes les requêtes HTTP
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = request.user?.id;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Log seulement si ce n'est pas une route de logs (éviter boucle infinie)
          if (!url.includes('/logs')) {
            this.logRequest(
              method,
              url,
              statusCode,
              duration,
              ip,
              userAgent,
              userId,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log les erreurs
          if (!url.includes('/logs')) {
            this.logError(
              method,
              url,
              statusCode,
              duration,
              ip,
              userAgent,
              userId,
              error,
            );
          }
        },
      }),
    );
  }

  /**
   * Logger une requête réussie
   */
  private logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ipAddress: string | undefined,
    userAgent: string,
    userId?: string,
  ): void {
    const category = this.getCategoryFromUrl(url);
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;

    // Log INFO pour les requêtes réussies (fire and forget)
    this.logsService
      .logInfo(
        category,
        message,
        { method, url, statusCode, duration },
        userId,
        { ipAddress, userAgent, endpoint: url, method, statusCode, duration },
      )
      .catch(() => {
        // Silently ignore logging errors
      });
  }

  /**
   * Logger une erreur
   */
  private logError(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ipAddress: string | undefined,
    userAgent: string,
    userId: string | undefined,
    error: Error,
  ): void {
    const category = this.getCategoryFromUrl(url);
    const message = `${method} ${url} - ERROR ${statusCode} (${duration}ms)`;

    // Log ERROR (fire and forget)
    this.logsService
      .logError(category, message, error, userId, {
        ipAddress,
        userAgent,
        endpoint: url,
        method,
        statusCode,
        duration,
      })
      .catch(() => {
        // Silently ignore logging errors
      });
  }

  /**
   * Déterminer la catégorie de log basée sur l'URL
   */
  private getCategoryFromUrl(url: string): LogCategory {
    if (url.includes('/auth')) return LogCategory.AUTH;
    if (url.includes('/users')) return LogCategory.USER;
    if (url.includes('/products')) return LogCategory.PRODUCT;
    if (url.includes('/campaigns')) return LogCategory.CAMPAIGN;
    if (url.includes('/procedures') || url.includes('/steps'))
      return LogCategory.PROCEDURE;
    if (url.includes('/sessions')) return LogCategory.SESSION;
    if (url.includes('/wallets') || url.includes('/transactions'))
      return LogCategory.WALLET;
    if (url.includes('/messages')) return LogCategory.MESSAGE;
    if (url.includes('/admin')) return LogCategory.ADMIN;

    return LogCategory.SYSTEM;
  }
}
