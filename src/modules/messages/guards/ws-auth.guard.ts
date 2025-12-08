import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Guard d'authentification pour les connexions WebSocket
 * Vérifie le token Supabase et charge le profil utilisateur
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();

      // Si déjà authentifié (token stocké dans client.data)
      if (client.data.userId && client.data.userRole) {
        return true;
      }

      // Extraire le token du handshake
      const token = this.extractToken(client);
      if (!token) {
        throw new WsException('No token provided');
      }

      // Vérifier avec Supabase
      const supabaseUser = await this.supabaseService.verifyToken(token);
      if (!supabaseUser) {
        throw new WsException('Invalid token');
      }

      // Récupérer le profil
      const profile = await this.prismaService.profile.findUnique({
        where: { supabaseUserId: supabaseUser.id },
      });

      if (!profile || !profile.isActive) {
        throw new WsException('User not found or inactive');
      }

      // Attacher les infos au socket pour réutilisation
      client.data.userId = profile.id;
      client.data.supabaseUserId = profile.supabaseUserId;
      client.data.userRole = profile.role;
      client.data.email = profile.email;

      this.logger.log(`WebSocket authenticated: user ${profile.id} (${profile.role})`);

      return true;
    } catch (error) {
      this.logger.error(`WS Auth failed: ${error.message}`);
      throw new WsException('Authentication failed');
    }
  }

  /**
   * Extrait le token depuis le handshake
   * Supporte: handshake.auth.token et handshake.query.token
   */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth;
    const query = client.handshake.query;

    return (auth.token as string) || (query.token as string) || null;
  }
}
