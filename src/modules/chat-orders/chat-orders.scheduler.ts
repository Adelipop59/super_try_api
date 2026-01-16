import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatOrdersService } from './chat-orders.service';

/**
 * Scheduler pour les tâches automatiques des Chat Orders
 */
@Injectable()
export class ChatOrdersScheduler {
  private readonly logger = new Logger(ChatOrdersScheduler.name);

  constructor(private readonly chatOrdersService: ChatOrdersService) {}

  /**
   * CRON job: Annuler les orders UGC dont la deadline est dépassée
   * Exécuté toutes les 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredOrders() {
    this.logger.log('Running expired orders check...');

    try {
      const cancelledCount = await this.chatOrdersService.cancelExpiredOrders();

      if (cancelledCount > 0) {
        this.logger.log(`✅ Cancelled ${cancelledCount} expired chat order(s)`);
      } else {
        this.logger.debug('No expired orders found');
      }
    } catch (error) {
      this.logger.error(`❌ Failed to cancel expired orders: ${error.message}`);
    }
  }
}
