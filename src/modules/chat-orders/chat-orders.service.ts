import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import {
  ChatOrder,
  ChatOrderStatus,
  ChatOrderType,
  TransactionType,
  TransactionStatus,
  UserRole,
} from '@prisma/client';
import { CreateChatOrderDto } from './dto/create-chat-order.dto';
import { DeliverOrderDto } from './dto/delivery-file.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { DisputeOrderDto } from './dto/dispute-order.dto';
import { ResolveOrderDisputeDto } from './dto/resolve-order-dispute.dto';
import { MessagesGateway } from '../messages/messages.gateway';
import { NotificationEventsHelper } from '../notifications/helpers/notification-events.helper';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class ChatOrdersService {
  private readonly logger = new Logger(ChatOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway?: MessagesGateway,
    @Inject(forwardRef(() => NotificationEventsHelper))
    private readonly notificationEventsHelper?: NotificationEventsHelper,
  ) {}

  async createOrder(
    sessionId: string,
    buyerId: string,
    dto: CreateChatOrderDto,
  ): Promise<ChatOrder> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            seller: {
              select: {
                id: true,
                stripeCustomerId: true,
                firstName: true,
                email: true,
              },
            },
          },
        },
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.campaign.sellerId !== buyerId) {
      throw new ForbiddenException('Only seller can create orders');
    }

    // Validation: prix minimum 10€
    if (dto.amount < 10) {
      throw new BadRequestException(
        'Le prix minimum pour une commande UGC est de 10€',
      );
    }

    // Vérifier que le PRO a un Stripe Customer ID
    if (!session.campaign.seller.stripeCustomerId) {
      throw new BadRequestException(
        'Vous devez configurer votre méthode de paiement avant de créer une commande',
      );
    }

    // Créer d'abord l'order sans Payment Intent
    const tempOrder = await this.prisma.chatOrder.create({
      data: {
        sessionId,
        buyerId,
        sellerId: session.testerId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        deliveryDeadline: dto.deliveryDeadline
          ? new Date(dto.deliveryDeadline)
          : null,
        metadata: dto.metadata as any,
      },
    });

    let order: ChatOrder;
    try {
      // Créer Payment Intent Stripe (argent bloqué sur carte bleue)
      const paymentIntent =
        await this.stripeService.createChatOrderPaymentIntent(
          Number(dto.amount),
          session.campaign.seller.stripeCustomerId,
          {
            orderId: tempOrder.id,
            sessionId,
            description: dto.description,
          },
        );

      // Mettre à jour avec le Payment Intent ID
      order = await this.prisma.chatOrder.update({
        where: { id: tempOrder.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
        } as any, // TODO: Régénérer Prisma client après migration
      });
    } catch (error) {
      // Si erreur Stripe, supprimer l'order créé
      await this.prisma.chatOrder.delete({ where: { id: tempOrder.id } });
      throw error;
    }

    await this.logsService.logInfo(
      'CAMPAIGN' as any,
      `Chat order created: ${dto.type}`,
      { orderId: order.id, amount: dto.amount },
      buyerId,
    );

    const orderWithRelations = await this.prisma.chatOrder.findUnique({
      where: { id: order.id },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        seller: { select: { firstName: true, lastName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (this.messagesGateway) {
      this.messagesGateway.emitChatOrderEvent(
        sessionId,
        'chat-order:new',
        orderWithRelations,
      );
    }

    if (this.notificationEventsHelper) {
      await this.notificationEventsHelper.chatOrderCreated({
        testerId: session.testerId,
        testerName:
          orderWithRelations?.seller.firstName ||
          orderWithRelations?.seller.email ||
          'Testeur',
        sellerName:
          orderWithRelations?.buyer.firstName ||
          orderWithRelations?.buyer.email ||
          'Vendeur',
        campaignTitle: session.campaign.title,
        orderType: dto.type,
        amount: Number(dto.amount),
        description: dto.description,
        deliveryDeadline: dto.deliveryDeadline
          ? new Date(dto.deliveryDeadline)
          : undefined,
        sessionId,
        orderId: order.id,
      });
    }

    return order;
  }

  async acceptOrder(orderId: string, userId: string): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.sellerId !== userId) {
      throw new ForbiddenException('Only seller can accept');
    }

    if (order.status !== ChatOrderStatus.PENDING) {
      throw new BadRequestException('Order not pending');
    }

    const updated = await this.prisma.chatOrder.update({
      where: { id: orderId },
      data: { status: ChatOrderStatus.ACCEPTED },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        seller: { select: { firstName: true, lastName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    await this.logsService.logInfo(
      'CAMPAIGN' as any,
      'Chat order accepted',
      { orderId },
      userId,
    );

    if (this.messagesGateway) {
      this.messagesGateway.emitChatOrderEvent(
        order.sessionId,
        'chat-order:accepted',
        updated,
      );
    }

    return updated;
  }

  /**
   * Testeur refuse la demande UGC
   * → Annule le Payment Intent Stripe (argent débloqué sur carte PRO)
   */
  async rejectOrder(
    orderId: string,
    userId: string,
    dto: RejectOrderDto,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.sellerId !== userId) {
      throw new ForbiddenException('Only seller can reject');
    }

    if (order.status !== ChatOrderStatus.PENDING) {
      throw new BadRequestException('Order not pending');
    }

    // Annuler le Payment Intent Stripe
    const orderAny = order as any;
    if (orderAny.stripePaymentIntentId) {
      try {
        await this.stripeService.cancelChatOrderPaymentIntent(
          orderAny.stripePaymentIntentId,
        );
        this.logger.log(`Payment Intent cancelled for order ${orderId}`);
      } catch (error) {
        this.logger.error(`Failed to cancel Payment Intent: ${error.message}`);
        // Continue quand même, l'order sera rejeté
      }
    }

    const updated = await this.prisma.chatOrder.update({
      where: { id: orderId },
      data: {
        status: ChatOrderStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: dto.reason,
      } as any,
    });

    await this.logsService.logInfo(
      'CAMPAIGN' as any,
      'Chat order rejected',
      { orderId, reason: dto.reason },
      userId,
    );

    // Emit WebSocket event
    const orderWithRelations = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (this.messagesGateway && orderWithRelations) {
      this.messagesGateway.emitChatOrderEvent(
        order.sessionId,
        'chat-order:rejected',
        orderWithRelations,
      );
    }

    return updated;
  }

  /**
   * PRO annule sa demande UGC (avant que le testeur accepte)
   * → Annule le Payment Intent Stripe
   */
  async cancelOrder(orderId: string, userId: string): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can cancel');
    }

    if (order.status !== ChatOrderStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending orders');
    }

    // Annuler le Payment Intent Stripe
    const orderAny = order as any;
    if (orderAny.stripePaymentIntentId) {
      try {
        await this.stripeService.cancelChatOrderPaymentIntent(
          orderAny.stripePaymentIntentId,
        );
        this.logger.log(`Payment Intent cancelled for order ${orderId}`);
      } catch (error) {
        this.logger.error(`Failed to cancel Payment Intent: ${error.message}`);
        // Continue quand même
      }
    }

    const updated = await this.prisma.chatOrder.update({
      where: { id: orderId },
      data: {
        status: ChatOrderStatus.CANCELLED,
        cancelledAt: new Date(),
      } as any,
    });

    await this.logsService.logInfo(
      'CAMPAIGN' as any,
      'Chat order cancelled',
      { orderId },
      userId,
    );

    // Emit WebSocket event
    const orderWithRelations = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (this.messagesGateway && orderWithRelations) {
      this.messagesGateway.emitChatOrderEvent(
        order.sessionId,
        'chat-order:cancelled',
        orderWithRelations,
      );
    }

    return updated;
  }

  async deliverOrder(
    orderId: string,
    userId: string,
    dto: DeliverOrderDto,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.sellerId !== userId) {
      throw new ForbiddenException('Only seller can deliver');
    }

    if (order.status !== ChatOrderStatus.ACCEPTED) {
      throw new BadRequestException('Order must be accepted first');
    }

    const updated = await this.prisma.chatOrder.update({
      where: { id: orderId },
      data: {
        status: ChatOrderStatus.DELIVERED,
        deliveryProof: dto.deliveryProof as any,
        deliveredAt: new Date(),
      },
    });

    await this.logsService.logInfo(
      'CAMPAIGN' as any,
      'Chat order delivered',
      { orderId },
      userId,
    );

    const orderFull = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, firstName: true, email: true } },
        seller: { select: { id: true, firstName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    await this.emitWebSocketAndNotify(orderId, 'chat-order:delivered', {
      type: 'delivered',
      params: {
        sellerId: orderFull!.buyerId,
        sellerName: orderFull!.buyer.firstName || orderFull!.buyer.email,
        testerName: orderFull!.seller.firstName || orderFull!.seller.email,
        campaignTitle: orderFull!.session.campaign.title,
        orderType: orderFull!.type,
        amount: Number(orderFull!.amount),
        description: orderFull!.description,
        deliveredAt: orderFull!.deliveredAt!,
        sessionId: orderFull!.sessionId,
        orderId: orderFull!.id,
      },
    });

    return updated;
  }

  /**
   * PRO valide la livraison UGC
   * → Capture Payment Intent (prélèvement sur carte bleue)
   * → Transfer au testeur (avec déduction fees)
   */
  async validateDelivery(orderId: string, userId: string): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          select: {
            id: true,
            stripeAccountId: true,
            firstName: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can validate');
    }

    if (order.status !== ChatOrderStatus.DELIVERED) {
      throw new BadRequestException('Order not delivered yet');
    }

    const orderAny = order as any;
    if (!orderAny.stripePaymentIntentId) {
      throw new BadRequestException('No Payment Intent found for this order');
    }

    if (!order.seller.stripeAccountId) {
      throw new BadRequestException(
        'Le testeur doit avoir un compte Stripe Connect configuré',
      );
    }

    // 1. Capturer le Payment Intent (prélever l'argent sur carte bleue du PRO)
    const paymentIntent =
      await this.stripeService.captureChatOrderPaymentIntent(
        orderAny.stripePaymentIntentId,
      );

    // 2. Calculer les fees
    const commissionCalc = this.stripeService.calculateUGCCommission(
      Number(order.amount),
    );
    const amountAfterCommission = commissionCalc.amountAfterCommission / 100;

    // 3. Créer Transfer vers testeur (depuis compte plateforme vers Stripe Connect testeur)
    const transfer = await this.stripeService.createChatOrderTransferToTester(
      order.seller.stripeAccountId,
      commissionCalc.amountAfterCommission, // Montant en centimes après déduction fees
      order.id,
      order.description,
    );

    // 4. Créer Transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        type: TransactionType.CHAT_ORDER_RELEASE,
        status: TransactionStatus.COMPLETED,
        amount: amountAfterCommission,
        reason: `Payment released: ${order.description.substring(0, 50)}`,
        sessionId: order.sessionId,
        chatOrderId: order.id,
        stripePaymentIntentId: paymentIntent.id,
        metadata: {
          transferId: transfer.id,
          commission: commissionCalc.commission / 100,
          originalAmount: commissionCalc.originalAmount / 100,
        },
      },
    });

    // 5. Mettre à jour l'order
    const updated = await this.prisma.chatOrder.update({
      where: { id: orderId },
      data: {
        status: ChatOrderStatus.COMPLETED,
        validatedAt: new Date(),
        validatedBy: userId,
        stripeTransferId: transfer.id,
        paidAt: new Date(),
        paidAmount: amountAfterCommission,
        transactionId: transaction.id,
      } as any,
    });

    await this.logsService.logSuccess(
      'CAMPAIGN' as any,
      'Chat order completed',
      { orderId },
      userId,
    );

    const orderFull = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, firstName: true, email: true } },
        seller: { select: { id: true, firstName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    await this.emitWebSocketAndNotify(orderId, 'chat-order:completed', {
      type: 'completed',
      params: {
        testerId: orderFull!.sellerId,
        testerName: orderFull!.seller.firstName || orderFull!.seller.email,
        sellerName: orderFull!.buyer.firstName || orderFull!.buyer.email,
        campaignTitle: orderFull!.session.campaign.title,
        orderType: orderFull!.type,
        amount: Number(orderFull!.amount),
        description: orderFull!.description,
        validatedAt: orderFull!.validatedAt!,
        sessionId: orderFull!.sessionId,
        orderId: orderFull!.id,
      },
    });

    return updated;
  }

  async disputeOrder(
    orderId: string,
    userId: string,
    dto: DisputeOrderDto,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Only participants can dispute');
    }

    const validStatuses: ChatOrderStatus[] = [
      ChatOrderStatus.ACCEPTED,
      ChatOrderStatus.DELIVERED,
      ChatOrderStatus.COMPLETED,
    ];

    if (!validStatuses.includes(order.status)) {
      throw new BadRequestException('Cannot dispute this order');
    }

    const updated = await this.prisma.chatOrder.update({
      where: { id: orderId },
      data: {
        status: ChatOrderStatus.DISPUTED,
        disputedAt: new Date(),
        disputeReason: dto.reason,
      },
    });

    await this.logsService.logWarning(
      'CAMPAIGN' as any,
      'Chat order disputed',
      { orderId, reason: dto.reason },
      userId,
    );

    // Emit WebSocket + Email notification
    const orderFull = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, firstName: true, email: true } },
        seller: { select: { id: true, firstName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (orderFull) {
      // Determine who to notify (the other party)
      const isDisputedByBuyer = userId === orderFull.buyerId;
      const recipientId = isDisputedByBuyer
        ? orderFull.sellerId
        : orderFull.buyerId;
      const recipientName = isDisputedByBuyer
        ? orderFull.seller.firstName || orderFull.seller.email
        : orderFull.buyer.firstName || orderFull.buyer.email;
      const disputedByName = isDisputedByBuyer
        ? orderFull.buyer.firstName || orderFull.buyer.email
        : orderFull.seller.firstName || orderFull.seller.email;

      await this.emitWebSocketAndNotify(orderId, 'chat-order:disputed', {
        type: 'disputed',
        params: {
          recipientId,
          recipientName,
          disputedByName,
          campaignTitle: orderFull.session.campaign.title,
          orderType: orderFull.type,
          amount: Number(orderFull.amount),
          disputeReason: dto.reason,
          disputedAt: orderFull.disputedAt!,
          sessionId: orderFull.sessionId,
          orderId: orderFull.id,
        },
      });
    }

    return updated;
  }

  /**
   * Admin résout un litige
   * - REFUND_BUYER : Annule Payment Intent → Argent retourné au PRO
   * - RELEASE_SELLER : Capture Payment Intent + Transfer au testeur
   */
  async resolveDispute(
    orderId: string,
    adminId: string,
    dto: ResolveOrderDisputeDto,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          select: {
            id: true,
            stripeAccountId: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== ChatOrderStatus.DISPUTED) {
      throw new BadRequestException('Order not disputed');
    }

    const orderAny = order as any;
    let updated: ChatOrder;

    if (dto.resolution === 'REFUND_BUYER') {
      // Annuler le Payment Intent → Remboursement PRO
      if (orderAny.stripePaymentIntentId) {
        try {
          await this.stripeService.cancelChatOrderPaymentIntent(
            orderAny.stripePaymentIntentId,
          );
          this.logger.log(
            `Payment Intent cancelled (dispute resolved): ${orderId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to cancel Payment Intent: ${error.message}`,
          );
        }
      }

      updated = await this.prisma.chatOrder.update({
        where: { id: orderId },
        data: {
          status: ChatOrderStatus.REFUNDED,
          disputeResolvedAt: new Date(),
          disputeResolution: dto.adminNotes,
          disputeResolvedBy: adminId,
        } as any,
      });
    } else {
      // RELEASE_SELLER : Payer le testeur
      if (!orderAny.stripePaymentIntentId) {
        throw new BadRequestException('No Payment Intent found');
      }

      if (!order.seller.stripeAccountId) {
        throw new BadRequestException('Testeur sans compte Stripe Connect');
      }

      // Capturer Payment Intent
      const paymentIntent =
        await this.stripeService.captureChatOrderPaymentIntent(
          orderAny.stripePaymentIntentId,
        );

      // Calculer fees
      const commissionCalc = this.stripeService.calculateUGCCommission(
        Number(order.amount),
      );
      const amountAfterCommission = commissionCalc.amountAfterCommission / 100;

      // Transfer au testeur (depuis compte plateforme vers Stripe Connect testeur)
      const transfer = await this.stripeService.createChatOrderTransferToTester(
        order.seller.stripeAccountId,
        commissionCalc.amountAfterCommission, // Montant en centimes après déduction fees
        order.id,
        order.description,
      );

      // Créer transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          type: TransactionType.CHAT_ORDER_RELEASE,
          status: TransactionStatus.COMPLETED,
          amount: amountAfterCommission,
          reason: `Dispute resolved: Payment to seller - ${dto.adminNotes}`,
          sessionId: order.sessionId,
          chatOrderId: order.id,
          stripePaymentIntentId: paymentIntent.id,
          metadata: {
            transferId: transfer.id,
            commission: commissionCalc.commission / 100,
          },
        },
      });

      updated = await this.prisma.chatOrder.update({
        where: { id: orderId },
        data: {
          status: ChatOrderStatus.COMPLETED,
          disputeResolvedAt: new Date(),
          disputeResolution: dto.adminNotes,
          disputeResolvedBy: adminId,
          stripeTransferId: transfer.id,
          paidAt: new Date(),
          paidAmount: amountAfterCommission,
          transactionId: transaction.id,
        } as any,
      });
    }

    await this.logsService.logSuccess(
      'ADMIN' as any,
      'Dispute resolved',
      { orderId, resolution: dto.resolution },
      adminId,
    );

    // Emit WebSocket + Email notification to both parties
    const orderFull = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, firstName: true, email: true } },
        seller: { select: { id: true, firstName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (orderFull) {
      await this.emitWebSocketAndNotify(
        orderId,
        'chat-order:dispute-resolved',
        {
          type: 'dispute-resolved',
          params: {
            buyerId: orderFull.buyerId,
            buyerName: orderFull.buyer.firstName || orderFull.buyer.email,
            sellerId: orderFull.sellerId,
            sellerName: orderFull.seller.firstName || orderFull.seller.email,
            campaignTitle: orderFull.session.campaign.title,
            orderType: orderFull.type,
            amount: Number(orderFull.amount),
            description: orderFull.description,
            resolution: dto.resolution,
            adminNotes: dto.adminNotes,
            finalStatus: updated.status,
            sessionId: orderFull.sessionId,
            orderId: orderFull.id,
          },
        },
      );
    }

    return updated;
  }

  async getSessionOrders(
    sessionId: string,
    userId: string,
  ): Promise<ChatOrder[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.testerId !== userId && session.campaign.sellerId !== userId) {
      throw new ForbiddenException('Not a participant');
    }

    return this.prisma.chatOrder.findMany({
      where: { sessionId },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderDetails(
    orderId: string,
    userId: string,
    userRole: string,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        session: {
          include: {
            campaign: true,
          },
        },
        // Les transactions sont accessibles via la relation transactions (pluriel)
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      userRole !== UserRole.ADMIN &&
      order.buyerId !== userId &&
      order.sellerId !== userId
    ) {
      throw new ForbiddenException('Not a participant');
    }

    return order;
  }

  private async emitWebSocketAndNotify(
    orderId: string,
    event: string,
    notification?: {
      type: 'delivered' | 'completed' | 'disputed' | 'dispute-resolved';
      params: any;
    },
  ): Promise<void> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (!order) return;

    if (this.messagesGateway) {
      this.messagesGateway.emitChatOrderEvent(order.sessionId, event, order);
    }

    if (this.notificationEventsHelper && notification) {
      if (notification.type === 'delivered') {
        await this.notificationEventsHelper.chatOrderDelivered(
          notification.params,
        );
      } else if (notification.type === 'completed') {
        await this.notificationEventsHelper.chatOrderCompleted(
          notification.params,
        );
      } else if (notification.type === 'disputed') {
        await this.notificationEventsHelper.chatOrderDisputed(
          notification.params,
        );
      } else if (notification.type === 'dispute-resolved') {
        await this.notificationEventsHelper.chatOrderDisputeResolved(
          notification.params,
        );
      }
    }
  }

  /**
   * Annuler les orders UGC dont la deadline est dépassée
   * Appelé par CRON job toutes les 10 minutes
   * @returns Nombre d'orders annulées
   */
  async cancelExpiredOrders(): Promise<number> {
    const now = new Date();

    // Trouver tous les orders ACCEPTED avec deadline dépassée
    const expiredOrders = await this.prisma.chatOrder.findMany({
      where: {
        status: ChatOrderStatus.ACCEPTED,
        deliveryDeadline: {
          lt: now, // deadline < maintenant
        },
      },
    });

    if (expiredOrders.length === 0) {
      return 0;
    }

    this.logger.log(`Found ${expiredOrders.length} expired chat orders`);

    let cancelledCount = 0;

    // Annuler chaque order
    for (const order of expiredOrders) {
      try {
        const orderAny = order as any;

        // Annuler le Payment Intent Stripe
        if (orderAny.stripePaymentIntentId) {
          try {
            await this.stripeService.cancelChatOrderPaymentIntent(
              orderAny.stripePaymentIntentId,
            );
            this.logger.log(
              `Payment Intent cancelled (expired): ${order.id} - ${orderAny.stripePaymentIntentId}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to cancel Payment Intent for order ${order.id}: ${error.message}`,
            );
            // Continue quand même pour mettre à jour le statut
          }
        }

        // Mettre à jour le statut
        await this.prisma.chatOrder.update({
          where: { id: order.id },
          data: {
            status: ChatOrderStatus.CANCELLED,
            cancelledAt: now,
          } as any,
        });

        // Émettre événement WebSocket
        const orderWithRelations = await this.prisma.chatOrder.findUnique({
          where: { id: order.id },
          include: {
            buyer: { select: { id: true, firstName: true, email: true } },
            seller: { select: { id: true, firstName: true, email: true } },
            session: { include: { campaign: { select: { title: true } } } },
          },
        });

        if (this.messagesGateway && orderWithRelations) {
          this.messagesGateway.emitChatOrderEvent(
            order.sessionId,
            'chat-order:expired',
            orderWithRelations,
          );
        }

        // TODO: Notifier le PRO que sa demande a expiré

        cancelledCount++;
      } catch (error) {
        this.logger.error(
          `Failed to cancel expired order ${order.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Successfully cancelled ${cancelledCount}/${expiredOrders.length} expired orders`,
    );

    return cancelledCount;
  }
}
