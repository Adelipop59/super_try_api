import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory, Prisma } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageFilterDto } from './dto/message-filter.dto';

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
        campaign: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Vérifier que l'utilisateur est soit le testeur soit le vendeur
    const isTester = session.testerId === userId;
    const isSeller = session.campaign.sellerId === userId;

    if (!isTester && !isSeller) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Créer le message
    const message = await this.prisma.message.create({
      data: {
        sessionId,
        senderId: userId,
        content: dto.content,
        attachments: dto.attachments ? (dto.attachments as any) : null,
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

    await this.logsService.logSuccess(
      LogCategory.MESSAGE,
      `✅ Nouveau message envoyé dans la session ${sessionId}`,
      {
        messageId: message.id,
        sessionId,
        senderId: userId,
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
}
