import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'; // Wait, standard guard might not work easily with WS out of the box because context is different
// For now, assume a custom WsGuard or manual token verification

@WebSocketGateway({
  namespace: '/session',
  cors: {
    origin: '*',
  },
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SessionGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to /session: ${client.id}`);
    // Extract token, verify, attach user to client.user
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /session: ${client.id}`);
  }

  @SubscribeMessage('joinSession')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    // Basic authorization ideally happens here. Ensure client.user is participant of sessionId.
    client.join(payload.sessionId);
    this.logger.log(`Client ${client.id} joined session ${payload.sessionId}`);
    
    // Broadcast to room
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
    // Save message to DB using MessageService (to be implemented)
    
    // Broadcast to room instantly
    this.server.to(payload.sessionId).emit('newMessage', {
      sessionId: payload.sessionId,
      senderId: client.id, // Replace with real userId
      content: payload.content,
      createdAt: new Date().toISOString()
    });
  }

  @SubscribeMessage('typingStart')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    client.to(payload.sessionId).emit('typingStart', { clientId: client.id });
  }

  @SubscribeMessage('typingStop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    client.to(payload.sessionId).emit('typingStop', { clientId: client.id });
  }
}
