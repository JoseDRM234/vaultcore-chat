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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Mapa de usuarios conectados: userId -> Set<socketId>
  private activeUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'vaultcore_secret_key_2026_dev_environment',
      );
      const payload = this.jwtService.verify(token, { secret });
      const user = await this.usersService.findById(payload.sub);

      if (!user || user.status === 'suspended') {
        client.disconnect();
        return;
      }

      // Guardar información del usuario en el socket
      client.data.user = user;

      // Unir a sala personal
      client.join(`user_${user.id}`);

      // Registrar presencia
      if (!this.activeUsers.has(user.id)) {
        this.activeUsers.set(user.id, new Set());
      }
      this.activeUsers.get(user.id)!.add(client.id);

      // Notificar presencia online
      this.server.emit('presence:status', {
        userId: user.id,
        status: 'online',
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user) {
      const sockets = this.activeUsers.get(user.id);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.activeUsers.delete(user.id);
          this.server.emit('presence:status', {
            userId: user.id,
            status: 'offline',
          });
        }
      }
    }
  }

  @SubscribeMessage('channel:join')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const channelId = typeof data === 'string' ? data : data?.channelId;
    if (channelId) {
      client.join(`channel_${channelId}`);
      return { status: 'joined', channelId };
    }
  }

  @SubscribeMessage('channel:leave')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const channelId = typeof data === 'string' ? data : data?.channelId;
    if (channelId) {
      client.leave(`channel_${channelId}`);
      return { status: 'left', channelId };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      channelId: string;
      ciphertext: string;
      iv: string;
      signature?: string;
    },
  ) {
    const user = client.data?.user;
    if (!user) return;

    // Asegurar que el socket esté unido a la sala del canal
    client.join(`channel_${payload.channelId}`);

    // Persistir como ciphertext en base de datos
    const message = await this.messagesService.sendMessage(
      payload.channelId,
      user.id,
      {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        signature: payload.signature,
      },
    );

    // Retransmitir a todos los miembros de la sala del canal
    this.server.to(`channel_${payload.channelId}`).emit('message:new', message);

    return message;
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data?.user;
    if (user && data?.channelId) {
      client.to(`channel_${data.channelId}`).emit('typing:update', {
        channelId: data.channelId,
        userId: user.id,
        userName: user.fullName,
        isTyping: true,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data?.user;
    if (user && data?.channelId) {
      client.to(`channel_${data.channelId}`).emit('typing:update', {
        channelId: data.channelId,
        userId: user.id,
        userName: user.fullName,
        isTyping: false,
      });
    }
  }
}
