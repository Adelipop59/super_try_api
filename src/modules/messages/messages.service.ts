import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory, Prisma, SessionStatus } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageFilterDto } from './dto/message-filter.dto';
import { DeclareDisputeDto } from './dto/declare-dispute.dto';
import { ResolveSessionDisputeDto } from './dto/resolve-dispute.dto';

// Type helper pour les réponses Prisma
type PrismaMessageResponse = any;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * 1. Envoyer un message dans une session
   * Version enrichie avec WebSocket, lock conversation et types de messages
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<PrismaMessageResponse> {
    // Vérifier que la session existe
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: { seller: true },
        },
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Récupérer l'utilisateur pour vérifier son rôle
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier le verrouillage de la conversation
    if (session.isConversationLocked) {
      // Seul ADMIN peut envoyer des messages quand la conversation est verrouillée
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException(
          'Conversation is locked due to dispute. Only admin can send messages.',
        );
      }
    }

    // Vérifier que l'utilisateur est participant (testeur, vendeur, ou admin)
    const isTester = session.testerId === userId;
    const isSeller = session.campaign.sellerId === userId;
    const isAdmin = user.role === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Traiter les pièces jointes avec métadonnées
    let processedAttachments: any = null;
    if (dto.attachments && dto.attachments.length > 0) {
      processedAttachments = dto.attachments.map((att) => ({
        url: att.url,
        filename: att.filename,
        size: att.size,
        type: att.type,
        uploadedAt: new Date().toISOString(),
      }));
    }

    // Déterminer le type de message
    let messageType = 'TEXT';
    if (processedAttachments && processedAttachments.length > 0) {
      const firstType = processedAttachments[0].type;
      if (firstType.startsWith('image/')) messageType = 'IMAGE';
      else if (firstType.startsWith('video/')) messageType = 'VIDEO';
      else if (firstType === 'application/pdf') messageType = 'PDF';
    }

    // Créer le message
    const message = await this.prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        content: dto.content,
        attachments: processedAttachments as any,
        messageType,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // TODO: Émettre via WebSocket si gateway disponible
    // if (this.messagesGateway) {
    //   this.messagesGateway.emitNewMessage(sessionId, message);
    // }

    // TODO: Envoyer notification email au destinataire
    // const recipientId = isTester ? session.campaign.sellerId : session.testerId;
    // const recipient = isTester ? session.campaign.seller : session.tester;
    // await this.notificationEventsHelper.messageReceived({...});

    await this.logsService.logSuccess(
      LogCategory.MESSAGE,
      `✅ Nouveau message envoyé dans la session ${sessionId}`,
      {
        messageId: message.id,
        sessionId,
        senderId: userId,
        messageType,
      },
    );

    return message;
  }

  /**
   * 2. Lister les messages d'une session
   */
  async findAll(
    sessionId: string,
    userId: string,
    userRole: string,
    filters: MessageFilterDto,
  ): Promise<PrismaMessageResponse[]> {
    // Vérifier que la session existe
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier les permissions
    const isTester = session.testerId === userId;
    const isSeller = session.campaign.sellerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    // Construire le where
    const where: Prisma.MessageWhereInput = {
      sessionId,
    };

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Ordre chronologique
      },
      take: filters.limit,
      skip: filters.offset,
    });

    return messages;
  }

  /**
   * 3. Marquer un message comme lu
   */
  async markAsRead(
    messageId: string,
    userId: string,
    userRole: string,
  ): Promise<PrismaMessageResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        session: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Vérifier que l'utilisateur est le destinataire (pas l'expéditeur)
    const isTester = message.session.testerId === userId;
    const isSeller = message.session.campaign.sellerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    // Ne pas marquer comme lu si c'est l'expéditeur
    if (message.senderId === userId) {
      return message;
    }

    // Si déjà lu, ne rien faire
    if (message.isRead) {
      return message;
    }

    // Marquer comme lu
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    await this.logsService.logInfo(
      LogCategory.MESSAGE,
      `🔵 Message marqué comme lu: ${messageId}`,
      {
        messageId,
        userId,
      },
    );

    return updatedMessage;
  }

  /**
   * 4. Marquer tous les messages d'une session comme lus
   */
  async markAllAsRead(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<{ count: number }> {
    // Vérifier que la session existe
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier les permissions
    const isTester = session.testerId === userId;
    const isSeller = session.campaign.sellerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    // Marquer tous les messages non lus (sauf ceux envoyés par l'utilisateur)
    const result = await this.prisma.message.updateMany({
      where: {
        sessionId,
        senderId: {
          not: userId, // Ne pas marquer ses propres messages
        },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    await this.logsService.logInfo(
      LogCategory.MESSAGE,
      `🔵 ${result.count} message(s) marqué(s) comme lus dans la session ${sessionId}`,
      {
        sessionId,
        count: result.count,
      },
    );

    return { count: result.count };
  }

  /**
   * 5. Compter les messages non lus d'un utilisateur
   */
  async countUnread(userId: string, userRole: string): Promise<number> {
    // Pour un testeur, compter les messages non lus dans ses sessions
    if (userRole === 'USER') {
      const count = await this.prisma.message.count({
        where: {
          isRead: false,
          senderId: {
            not: userId, // Ne pas compter ses propres messages
          },
          session: {
            testerId: userId,
          },
        },
      });
      return count;
    }

    // Pour un vendeur, compter les messages non lus dans les sessions de ses campagnes
    if (userRole === 'PRO') {
      const count = await this.prisma.message.count({
        where: {
          isRead: false,
          senderId: {
            not: userId,
          },
          session: {
            campaign: {
              sellerId: userId,
            },
          },
        },
      });
      return count;
    }

    // ADMIN peut voir tout
    if (userRole === 'ADMIN') {
      const count = await this.prisma.message.count({
        where: {
          isRead: false,
        },
      });
      return count;
    }

    return 0;
  }

  /**
   * 6. Supprimer un message (ADMIN uniquement)
   */
  async remove(messageId: string): Promise<{ message: string }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    await this.logsService.logWarning(
      LogCategory.MESSAGE,
      `⚠️ Message supprimé par admin: ${messageId}`,
      { messageId },
    );

    return { message: 'Message deleted successfully' };
  }

  /**
   * 7. Récupérer les détails d'un message
   */
  async findOne(
    messageId: string,
    userId: string,
    userRole: string,
  ): Promise<PrismaMessageResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        session: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Vérifier les permissions
    const isTester = message.session.testerId === userId;
    const isSeller = message.session.campaign.sellerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isTester && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return message;
  }

  /**
   * 8. Vérifier l'accès à une session (pour WebSocket et endpoints)
   */
  async verifySessionAccess(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
      },
    });

    if (!session) {
      return false;
    }

    // Admin a accès à tout
    if (userRole === 'ADMIN') {
      return true;
    }

    // Testeur a accès à ses sessions
    if (session.testerId === userId) {
      return true;
    }

    // Vendeur a accès aux sessions de ses campagnes
    if (session.campaign.sellerId === userId) {
      return true;
    }

    return false;
  }

  /**
   * 9. Demander l'aide d'un admin
   */
  async requestAdminHelp(
    sessionId: string,
    userId: string,
    userRole: string,
    reason: string,
  ): Promise<{ message: string; session: any }> {
    // Vérifier l'accès
    const hasAccess = await this.verifySessionAccess(sessionId, userId, userRole);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true, tester: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.adminInvitedAt) {
      throw new BadRequestException('Admin already invited to this conversation');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        adminInvitedBy: userId,
        adminInvitedAt: new Date(),
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    // Créer un message système
    await this.createSystemMessage(
      sessionId,
      userId,
      `Admin help requested by ${userRole === 'PRO' ? 'seller' : 'tester'}: ${reason}`,
    );

    await this.logsService.logInfo(
      LogCategory.MESSAGE,
      `🔵 Admin help requested for session ${sessionId} by user ${userId}`,
      { sessionId, userId, reason },
    );

    // TODO: Notifier tous les admins via NotificationEventsHelper

    return {
      message: 'Admin help requested successfully',
      session: updatedSession,
    };
  }

  /**
   * 10. Admin rejoint une conversation
   */
  async adminJoinConversation(
    sessionId: string,
    adminId: string,
  ): Promise<{ message: string; session: any }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true, tester: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        adminJoinedAt: new Date(),
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    // Créer un message système
    await this.createSystemMessage(
      sessionId,
      adminId,
      'An administrator has joined the conversation',
    );

    await this.logsService.logInfo(
      LogCategory.MESSAGE,
      `🔵 Admin ${adminId} joined session ${sessionId}`,
      { sessionId, adminId },
    );

    return {
      message: 'Admin joined conversation successfully',
      session: updatedSession,
    };
  }

  /**
   * 11. Déclarer un litige
   */
  async declareDispute(
    sessionId: string,
    userId: string,
    userRole: string,
    dto: DeclareDisputeDto,
  ): Promise<{ message: string; session: any }> {
    // Vérifier l'accès
    const hasAccess = await this.verifySessionAccess(sessionId, userId, userRole);
    if (!hasAccess || userRole === 'ADMIN') {
      throw new ForbiddenException('Only tester or seller can declare dispute');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true, tester: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier si déjà en litige
    if (session.status === SessionStatus.DISPUTED) {
      throw new BadRequestException('Session already in dispute');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.DISPUTED,
        disputedAt: new Date(),
        disputeReason: dto.reason,
        disputeDeclaredBy: userId,
        isConversationLocked: true, // Bloquer la conversation
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    // Créer un message système
    await this.createSystemMessage(
      sessionId,
      userId,
      `Dispute declared: ${dto.reason}`,
    );

    await this.logsService.logWarning(
      LogCategory.MESSAGE,
      `⚠️ Dispute declared for session ${sessionId} by user ${userId}`,
      { sessionId, userId, reason: dto.reason },
    );

    // TODO: Notifier admin et autre partie via NotificationEventsHelper

    return {
      message: 'Dispute declared successfully',
      session: updatedSession,
    };
  }

  /**
   * 12. Résoudre un litige (admin uniquement)
   */
  async resolveDispute(
    sessionId: string,
    adminId: string,
    dto: ResolveSessionDisputeDto,
  ): Promise<{ message: string; session: any }> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { campaign: true, tester: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.DISPUTED) {
      throw new BadRequestException('Session is not in dispute');
    }

    // Mettre à jour la session
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: dto.newStatus,
        disputeResolvedAt: new Date(),
        disputeResolution: dto.resolution,
        isConversationLocked: false, // Débloquer la conversation
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    // Créer un message système
    await this.createSystemMessage(
      sessionId,
      adminId,
      `Dispute resolved by admin: ${dto.resolution}`,
    );

    await this.logsService.logSuccess(
      LogCategory.MESSAGE,
      `✅ Dispute resolved for session ${sessionId} by admin ${adminId}`,
      { sessionId, adminId, resolution: dto.resolution },
    );

    // TODO: Notifier les deux parties via NotificationEventsHelper

    return {
      message: 'Dispute resolved successfully',
      session: updatedSession,
    };
  }

  /**
   * 13. Créer un message système
   */
  private async createSystemMessage(
    sessionId: string,
    userId: string,
    content: string,
  ): Promise<any> {
    return await this.prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        content,
        isSystemMessage: true,
        messageType: 'SYSTEM',
      },
    });
  }

  /**
   * 14. Récupérer les participants d'une conversation
   */
  async getConversationParticipants(
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const hasAccess = await this.verifySessionAccess(sessionId, userId, userRole);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const participants: any = {
      tester: session.tester,
      seller: session.campaign.seller,
    };

    // Si admin a rejoint, l'inclure
    if (session.adminJoinedAt) {
      participants.adminJoinedAt = session.adminJoinedAt;
      participants.adminInvitedBy = session.adminInvitedBy;
    }

    return participants;
  }
}
