import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} has no token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Store user info in socket
      (client as AuthenticatedSocket).data.user = payload;

      // Join user room
      const roomName = `user:${payload.sub}`;
      await client.join(roomName);

      this.logger.log(`Client connected: ${client.id}, User: ${payload.sub}`);
      this.logger.log(`Client ${client.id} joined room: ${roomName}`);

      // If admin, join admin room
      if (payload.role === 'ADMIN') {
        await client.join('admin');
        this.logger.log(`Client ${client.id} joined room: admin`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Connection unauthorized: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | undefined {
    // 1. Handshake auth object (Socket.IO v3+)
    if (client.handshake.auth && client.handshake.auth.token) {
      const authHeader = client.handshake.auth.token as string;
      return authHeader.replace(/^Bearer\s+/, '');
    }
    // 2. Query param (fallback)
    if (client.handshake.query && client.handshake.query.token) {
      return client.handshake.query.token as string;
    }
    // 3. Authorization header
    if (client.handshake.headers.authorization) {
      return client.handshake.headers.authorization.replace(/^Bearer\s+/, '');
    }
    return undefined;
  }
}
