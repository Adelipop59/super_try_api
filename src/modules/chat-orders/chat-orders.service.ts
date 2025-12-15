import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
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

@Injectable()
export class ChatOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
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
      include: { campaign: true, tester: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.campaign.sellerId !== buyerId) {
      throw new ForbiddenException('Only seller can create orders');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.chatOrder.create({
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

      if (dto.type !== ChatOrderType.TIP) {
        const escrowTransaction = await tx.transaction.create({
          data: {
            type: TransactionType.CHAT_ORDER_ESCROW,
            status: TransactionStatus.ESCROW,
            amount: dto.amount,
            reason: `Escrow for ${dto.type}: ${dto.description.substring(0, 50)}`,
            sessionId,
            chatOrderId: newOrder.id,
          },
        });

        await tx.chatOrder.update({
          where: { id: newOrder.id },
          data: { escrowTransactionId: escrowTransaction.id },
        });

        const sellerWallet = await tx.wallet.findUnique({
          where: { userId: session.testerId },
        });

        if (sellerWallet) {
          await tx.wallet.update({
            where: { userId: session.testerId },
            data: {
              pendingBalance: {
                increment: dto.amount,
              },
            },
          });
        }
      } else {
        const testerWallet = await tx.wallet.upsert({
          where: { userId: session.testerId },
          create: {
            userId: session.testerId,
            balance: dto.amount,
            totalEarned: dto.amount,
            lastCreditedAt: new Date(),
          },
          update: {
            balance: { increment: dto.amount },
            totalEarned: { increment: dto.amount },
            lastCreditedAt: new Date(),
          },
        });

        const releaseTransaction = await tx.transaction.create({
          data: {
            walletId: testerWallet.id,
            type: TransactionType.CHAT_ORDER_RELEASE,
            status: TransactionStatus.COMPLETED,
            amount: dto.amount,
            reason: `Tip from seller: ${dto.description.substring(0, 50)}`,
            sessionId,
            chatOrderId: newOrder.id,
          },
        });

        await tx.chatOrder.update({
          where: { id: newOrder.id },
          data: {
            status: ChatOrderStatus.COMPLETED,
            validatedAt: new Date(),
            releaseTransactionId: releaseTransaction.id,
          },
        });
      }

      return newOrder;
    });

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

    if (this.notificationEventsHelper && dto.type !== ChatOrderType.TIP) {
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

  async rejectOrder(
    orderId: string,
    userId: string,
    dto: RejectOrderDto,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: { escrowTransaction: true },
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.chatOrder.update({
        where: { id: orderId },
        data: {
          status: ChatOrderStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason: dto.reason,
        },
      });

      if (order.escrowTransactionId) {
        await tx.transaction.update({
          where: { id: order.escrowTransactionId },
          data: { status: TransactionStatus.REFUNDED },
        });

        await tx.wallet.update({
          where: { userId: order.sellerId },
          data: { pendingBalance: { decrement: order.amount } },
        });

        await tx.transaction.create({
          data: {
            type: TransactionType.CHAT_ORDER_REFUND,
            status: TransactionStatus.COMPLETED,
            amount: order.amount,
            reason: `Refund: Order rejected - ${dto.reason}`,
            sessionId: order.sessionId,
            chatOrderId: order.id,
          },
        });
      }

      return rejected;
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
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.chatOrder.update({
        where: { id: orderId },
        data: {
          status: ChatOrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      if (order.escrowTransactionId) {
        await tx.transaction.update({
          where: { id: order.escrowTransactionId },
          data: { status: TransactionStatus.REFUNDED },
        });

        await tx.wallet.update({
          where: { userId: order.sellerId },
          data: { pendingBalance: { decrement: order.amount } },
        });

        await tx.transaction.create({
          data: {
            type: TransactionType.CHAT_ORDER_REFUND,
            status: TransactionStatus.COMPLETED,
            amount: order.amount,
            reason: 'Refund: Order cancelled by buyer',
            sessionId: order.sessionId,
            chatOrderId: order.id,
          },
        });
      }

      return cancelled;
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
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
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

  async validateDelivery(orderId: string, userId: string): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: { escrowTransaction: true },
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const testerWallet = await tx.wallet.upsert({
        where: { userId: order.sellerId },
        create: {
          userId: order.sellerId,
          balance: order.amount,
          pendingBalance: 0,
          totalEarned: order.amount,
          lastCreditedAt: new Date(),
        },
        update: {
          balance: { increment: order.amount },
          pendingBalance: { decrement: order.amount },
          totalEarned: { increment: order.amount },
          lastCreditedAt: new Date(),
        },
      });

      const releaseTransaction = await tx.transaction.create({
        data: {
          walletId: testerWallet.id,
          type: TransactionType.CHAT_ORDER_RELEASE,
          status: TransactionStatus.COMPLETED,
          amount: order.amount,
          reason: `Payment released: ${order.description.substring(0, 50)}`,
          sessionId: order.sessionId,
          chatOrderId: order.id,
        },
      });

      if (order.escrowTransactionId) {
        await tx.transaction.update({
          where: { id: order.escrowTransactionId },
          data: { status: TransactionStatus.COMPLETED },
        });
      }

      const validated = await tx.chatOrder.update({
        where: { id: orderId },
        data: {
          status: ChatOrderStatus.COMPLETED,
          validatedAt: new Date(),
          validatedBy: userId,
          releaseTransactionId: releaseTransaction.id,
        },
      });

      return validated;
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
      const recipientId = isDisputedByBuyer ? orderFull.sellerId : orderFull.buyerId;
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

  async resolveDispute(
    orderId: string,
    adminId: string,
    dto: ResolveOrderDisputeDto,
  ): Promise<ChatOrder> {
    const order = await this.prisma.chatOrder.findUnique({
      where: { id: orderId },
      include: { escrowTransaction: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== ChatOrderStatus.DISPUTED) {
      throw new BadRequestException('Order not disputed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.resolution === 'REFUND_BUYER') {
        if (order.escrowTransactionId) {
          await tx.transaction.update({
            where: { id: order.escrowTransactionId },
            data: { status: TransactionStatus.REFUNDED },
          });

          await tx.wallet.update({
            where: { userId: order.sellerId },
            data: { pendingBalance: { decrement: order.amount } },
          });

          await tx.transaction.create({
            data: {
              type: TransactionType.CHAT_ORDER_REFUND,
              status: TransactionStatus.COMPLETED,
              amount: order.amount,
              reason: `Dispute resolved: Refund to buyer - ${dto.adminNotes}`,
              sessionId: order.sessionId,
              chatOrderId: order.id,
            },
          });
        }

        return tx.chatOrder.update({
          where: { id: orderId },
          data: {
            status: ChatOrderStatus.REFUNDED,
            disputeResolvedAt: new Date(),
            disputeResolution: dto.adminNotes,
            disputeResolvedBy: adminId,
          },
        });
      } else {
        const testerWallet = await tx.wallet.upsert({
          where: { userId: order.sellerId },
          create: {
            userId: order.sellerId,
            balance: order.amount,
            pendingBalance: 0,
            totalEarned: order.amount,
            lastCreditedAt: new Date(),
          },
          update: {
            balance: { increment: order.amount },
            pendingBalance: { decrement: order.amount },
            totalEarned: { increment: order.amount },
            lastCreditedAt: new Date(),
          },
        });

        const releaseTransaction = await tx.transaction.create({
          data: {
            walletId: testerWallet.id,
            type: TransactionType.CHAT_ORDER_RELEASE,
            status: TransactionStatus.COMPLETED,
            amount: order.amount,
            reason: `Dispute resolved: Payment to seller - ${dto.adminNotes}`,
            sessionId: order.sessionId,
            chatOrderId: order.id,
          },
        });

        if (order.escrowTransactionId) {
          await tx.transaction.update({
            where: { id: order.escrowTransactionId },
            data: { status: TransactionStatus.COMPLETED },
          });
        }

        return tx.chatOrder.update({
          where: { id: orderId },
          data: {
            status: ChatOrderStatus.COMPLETED,
            disputeResolvedAt: new Date(),
            disputeResolution: dto.adminNotes,
            disputeResolvedBy: adminId,
            releaseTransactionId: releaseTransaction.id,
          },
        });
      }
    });

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
      await this.emitWebSocketAndNotify(orderId, 'chat-order:dispute-resolved', {
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
      });
    }

    return updated;
  }

  async getSessionOrders(sessionId: string, userId: string): Promise<ChatOrder[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (
      session.testerId !== userId &&
      session.campaign.sellerId !== userId
    ) {
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
        escrowTransaction: true,
        releaseTransaction: true,
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
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
        session: { include: { campaign: { select: { title: true } } } },
      },
    });

    if (!order) return;

    if (this.messagesGateway) {
      this.messagesGateway.emitChatOrderEvent(order.sessionId, event, order);
    }

    if (this.notificationEventsHelper && notification) {
      if (notification.type === 'delivered') {
        await this.notificationEventsHelper.chatOrderDelivered(notification.params);
      } else if (notification.type === 'completed') {
        await this.notificationEventsHelper.chatOrderCompleted(notification.params);
      } else if (notification.type === 'disputed') {
        await this.notificationEventsHelper.chatOrderDisputed(notification.params);
      } else if (notification.type === 'dispute-resolved') {
        await this.notificationEventsHelper.chatOrderDisputeResolved(notification.params);
      }
    }
  }
}
