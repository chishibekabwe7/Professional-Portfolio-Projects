import { Logger } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Trip } from '../generated/prisma/client';

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: Date;
}

export interface GeofenceAlertPayload {
  geofenceName: string;
  type: 'entered' | 'exited';
  triggeredAt: Date;
}

export interface SpeedAlertPayload {
  speed: number;
  limit: number;
  lat: number;
  lng: number;
}

export interface IdleAlertPayload {
  duration: number;
  lat: number;
  lng: number;
}

export interface TripCompletedPayload {
  trip: Trip;
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

  emitGeofenceAlert(imei: string, alert: GeofenceAlertPayload): void {
    this.server.to(`tracker:${imei}`).emit('geofenceAlert', {
      imei,
      ...alert,
    });
  }

  emitSpeedAlert(imei: string, alert: SpeedAlertPayload): void {
    this.server.to(`tracker:${imei}`).emit('speedAlert', {
      imei,
      ...alert,
      triggeredAt: new Date(),
    });
  }

  emitIdleAlert(imei: string, alert: IdleAlertPayload): void {
    this.server.to(`tracker:${imei}`).emit('idleAlert', {
      imei,
      ...alert,
      triggeredAt: new Date(),
    });
  }

  emitTripCompleted(imei: string, trip: Trip): void {
    this.server.to(`tracker:${imei}`).emit('tripCompleted', {
      imei,
      trip,
      triggeredAt: new Date(),
    });
  }
}