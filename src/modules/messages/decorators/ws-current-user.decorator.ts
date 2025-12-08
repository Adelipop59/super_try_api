import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

/**
 * Decorator pour extraire l'utilisateur courant depuis un contexte WebSocket
 * Similaire à @CurrentUser mais pour les WebSockets
 */
export const WsCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const client: Socket = ctx.switchToWs().getClient();

    return {
      id: client.data.userId,
      supabaseUserId: client.data.supabaseUserId || '',
      email: client.data.email || '',
      role: client.data.userRole,
    };
  },
);
