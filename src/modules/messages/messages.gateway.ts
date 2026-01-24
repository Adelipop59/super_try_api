import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { MessagesService } from './messages.service';
import { WsCurrentUser } from './decorators/ws-current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { PrismaService } from '../../database/prisma.service';

interface TypingPayload {
  sessionId: string;
  isTyping: boolean;
}

interface ReadReceiptPayload {
  messageId: string;
  sessionId: string;
}

/**
 * Gateway WebSocket pour la messagerie en temps réel
 *
 * Fonctionnalités:
 * - Connexion/déconnexion avec authentification Supabase
 * - Room management (1 room = 1 session)
 * - Indicateurs de frappe ("Jean est en train d'écrire...")
 * - Read receipts ("vu à 14:32")
 * - Statut online/offline
 */
@WebSocketGateway({
  namespace: '/messages',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  // Mapping: userId -> Set<socketId>
  private readonly userSockets = new Map<string, Set<string>>();

  // Mapping: sessionId -> Set<userId> (qui est en train de taper)
  private readonly typingUsers = new Map<string, Set<string>>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Gère la connexion d'un client WebSocket
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // Extraire et valider le token
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: no token provided`);
        client.disconnect();
        return;
      }

      // Vérifier le token et récupérer l'utilisateur
      const user = await this.verifyTokenAndGetUser(client, token);
      if (!user) {
        this.logger.warn(`Connection rejected: invalid token`);
        client.disconnect();
        return;
      }

      // Stocker le mapping user-socket
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      this.logger.log(
        `Client connected: ${client.id} (User: ${user.id}, Role: ${user.role})`,
      );

      // Notifier les autres que cet utilisateur est en ligne
      this.broadcastUserStatus(user.id, 'online');
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Gère la déconnexion d'un client WebSocket
   */
  handleDisconnect(client: Socket): void {
    const userId = client.data.userId;

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);

        // Si l'utilisateur n'a plus de sockets actives, marquer comme offline
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.broadcastUserStatus(userId, 'offline');
        }
      }

      // Retirer des indicateurs de frappe
      this.typingUsers.forEach((users, sessionId) => {
        if (users.has(userId)) {
          users.delete(userId);
          this.emitToSession(sessionId, 'typing:stop', { userId, sessionId });
        }
      });
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Rejoindre une session (room)
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
    @WsCurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const { sessionId } = data;

    try {
      // Vérifier que l'utilisateur a accès à cette session
      const hasAccess = await this.messagesService.verifySessionAccess(
        sessionId,
        user.id,
        user.role,
      );

      if (!hasAccess) {
        client.emit('error', { message: 'Access denied to this session' });
        return;
      }

      // Rejoindre la room Socket.IO
      client.join(`session:${sessionId}`);
      this.logger.log(`User ${user.id} joined session ${sessionId}`);

      // Notifier les autres participants
      client.to(`session:${sessionId}`).emit('user:joined', {
        userId: user.id,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error joining session: ${error.message}`);
      client.emit('error', { message: 'Failed to join session' });
    }
  }

  /**
   * Quitter une session (room)
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('session:leave')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    const { sessionId } = data;
    client.leave(`session:${sessionId}`);

    const userId = client.data.userId;
    this.logger.log(`User ${userId} left session ${sessionId}`);

    // Arrêter de taper si l'utilisateur tapait
    this.handleStopTyping(client, { sessionId, isTyping: false });

    // Notifier les autres
    client.to(`session:${sessionId}`).emit('user:left', {
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Commencer à taper
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing:start')
  handleStartTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ): void {
    const { sessionId } = data;
    const userId = client.data.userId;

    if (!this.typingUsers.has(sessionId)) {
      this.typingUsers.set(sessionId, new Set());
    }
    this.typingUsers.get(sessionId)!.add(userId);

    // Émettre aux autres participants de la session
    client.to(`session:${sessionId}`).emit('typing:start', {
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Arrêter de taper
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing:stop')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingPayload,
  ): void {
    const { sessionId } = data;
    const userId = client.data.userId;

    const users = this.typingUsers.get(sessionId);
    if (users) {
      users.delete(userId);
    }

    // Émettre aux autres participants
    client.to(`session:${sessionId}`).emit('typing:stop', {
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Marquer un message comme lu
   */
  @UseGuards(WsAuthGuard)
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReadReceiptPayload,
    @WsCurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const { messageId, sessionId } = data;

    try {
      // Marquer le message comme lu dans la DB
      await this.messagesService.markAsRead(messageId, user.id, user.role);

      // Émettre le read receipt aux autres participants
      this.emitToSession(sessionId, 'message:read', {
        messageId,
        sessionId,
        readBy: user.id,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }

  /**
   * Émettre un nouveau message à tous les participants d'une session
   * Appelé depuis MessagesService après création du message en DB
   */
  emitNewMessage(sessionId: string, message: any): void {
    this.emitToSession(sessionId, 'message:new', message);
  }

  /**
   * Émettre un événement à tous les clients d'une session (room)
   */
  private emitToSession(sessionId: string, event: string, data: any): void {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * Diffuser le statut online/offline d'un utilisateur
   */
  private broadcastUserStatus(
    userId: string,
    status: 'online' | 'offline',
  ): void {
    this.server.emit('user:status', {
      userId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Émettre événement ChatOrder
   */
  emitChatOrderEvent(sessionId: string, event: string, order: any): void {
    this.emitToSession(sessionId, event, order);
  }

  /**
   * Vérifier si un utilisateur est en ligne
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Récupérer les utilisateurs en ligne dans une session
   */
  getOnlineUsersInSession(sessionId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(`session:${sessionId}`);
    if (!room) return [];

    const userIds = new Set<string>();
    room.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket?.data.userId) {
        userIds.add(socket.data.userId);
      }
    });

    return Array.from(userIds);
  }

  /**
   * Extraire le token depuis le handshake
   */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth;
    const query = client.handshake.query;

    return (auth.token as string) || (query.token as string) || null;
  }

  /**
   * Vérifier le token et récupérer l'utilisateur
   * Utilise le WsAuthGuard en interne
   */
  private async verifyTokenAndGetUser(
    client: Socket,
    token: string,
  ): Promise<AuthenticatedUser | null> {
    try {
      // Vérifier avec Supabase
      const supabaseUser = await this.supabaseService.verifyToken(token);
      if (!supabaseUser) {
        this.logger.warn('Invalid Supabase token');
        return null;
      }

      // Récupérer le profil
      const profile = await this.prismaService.profile.findUnique({
        where: { supabaseUserId: supabaseUser.id },
      });

      if (!profile || !profile.isActive) {
        this.logger.warn(
          `Profile not found or inactive for Supabase user ${supabaseUser.id}`,
        );
        return null;
      }

      // Attacher les infos au socket pour réutilisation
      client.data.userId = profile.id;
      client.data.supabaseUserId = profile.supabaseUserId;
      client.data.userRole = profile.role;
      client.data.email = profile.email;

      return {
        id: profile.id,
        supabaseUserId: profile.supabaseUserId,
        email: profile.email,
        role: profile.role,
      };
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }
}
