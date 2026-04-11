import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: Date;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class LocationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LocationGateway.name);

  @WebSocketServer()
  private server!: Server;

  afterInit(): void {
    this.logger.log('WebSocket tracking gateway ready');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToTracker')
  handleSubscribe(client: Socket, payload: { deviceId: string }): void {
    const room = `tracker:${payload.deviceId}`;
    client.join(room);
    client.emit('subscribed', { deviceId: payload.deviceId, status: 'ok' });
  }

  @SubscribeMessage('unsubscribeFromTracker')
  handleUnsubscribe(client: Socket, payload: { deviceId: string }): void {
    const room = `tracker:${payload.deviceId}`;
    client.leave(room);
  }

  broadcast(imei: string, data: LocationUpdatePayload): void {
    this.server.to(`tracker:${imei}`).emit('locationUpdate', {
      imei,
      ...data,
    });
  }
}