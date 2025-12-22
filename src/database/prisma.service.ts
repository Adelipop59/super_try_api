import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' }, // Active les logs de requêtes
        'info',
        'warn',
        'error',
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Configuration optimisée pour Supabase/PgBouncer
      // En mode transaction pooling, limitez le pool de connexions
      // Supabase recommande 1 connexion par CPU (généralement 2-4 pour les petites apps)
    });

    // Log les queries avec leur durée
    this.$on('query' as never, (e: any) => {
      if (e.duration > 100) {
        // Log seulement les queries lentes (>100ms)
        this.logger.warn(
          `Slow Query (${e.duration}ms): ${e.query.substring(0, 200)}`,
        );
      }
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to the database');
    } catch (error) {
      this.logger.error('Failed to connect to the database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }

  /**
   * Clean the database (useful for testing)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) =>
        typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );

    await Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof this];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          return (model as any).deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }
}
