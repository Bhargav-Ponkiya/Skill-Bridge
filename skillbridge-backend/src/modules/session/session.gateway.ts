import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';

@WebSocketGateway({
  namespace: '/session',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SessionGateway.name);
  private readonly connectedUsers = new Map<string, string[]>(); // userId -> socketId[]

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
      const accessToken = cookies.accessToken;

      if (!accessToken) {
        this.logger.warn(`Socket ${client.id} rejected: no accessToken cookie`);
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(accessToken);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(`Socket ${client.id} rejected: invalid token payload`);
        client.disconnect(true);
        return;
      }

      (client as any).userId = userId;

      const sockets = this.connectedUsers.get(userId) || [];
      sockets.push(client.id);
      this.connectedUsers.set(userId, sockets);
      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
      this.broadcastPresence(userId, 'online');
    } catch (err) {
      this.logger.warn(`Socket ${client.id} rejected: ${err}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as string | undefined;
    if (userId) {
      const sockets = this.connectedUsers.get(userId) || [];
      const updated = sockets.filter((id) => id !== client.id);
      if (updated.length === 0) {
        this.connectedUsers.delete(userId);
        this.broadcastPresence(userId, 'offline');
      } else {
        this.connectedUsers.set(userId, updated);
      }
      this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
    }
  }

  @SubscribeMessage('joinSession')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    client.join(payload.sessionId);
    this.logger.log(`Client ${client.id} joined session ${payload.sessionId}`);

    this.server.to(payload.sessionId).emit('sessionUpdated', {
      type: 'user_joined',
      clientId: client.id,
    });
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string; content: string },
  ) {
    const userId = (client as any).userId as string;
    // NOTE: This is a lightweight real-time relay only. Messages are NOT persisted here.
    // The canonical persistence path is the GraphQL sendMessage mutation. Clients should
    // use the mutation for reliable delivery and use this socket channel for optimistic UI.
    this.server.to(payload.sessionId).emit('newMessage', {
      sessionId: payload.sessionId,
      senderId: userId,
      content: payload.content,
      createdAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const userId = (client as any).userId as string;
    client
      .to(payload.sessionId)
      .emit('typing:start', { userId, sessionId: payload.sessionId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const userId = (client as any).userId as string;
    client
      .to(payload.sessionId)
      .emit('typing:stop', { userId, sessionId: payload.sessionId });
  }

  isUserOnline(userId: string): boolean {
    return (this.connectedUsers.get(userId)?.length ?? 0) > 0;
  }

  private broadcastPresence(userId: string, status: 'online' | 'offline') {
    this.server.emit('presence:update', { userId, status });
  }
}
