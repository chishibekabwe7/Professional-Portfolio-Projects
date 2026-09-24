import { Injectable } from '@nestjs/common';
import { Geofence, GeofenceAlert } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationGateway } from './location.gateway';

type CreateGeofenceInput = {
  deviceImei: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
};

type GeofenceTransitionType = 'entered' | 'exited';

@Injectable()
export class GeofenceService {
  private readonly deviceInsideGeofences = new Map<string, Set<number>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationGateway: LocationGateway,
  ) {}

  async createGeofence(data: CreateGeofenceInput): Promise<Geofence> {
    return this.prisma.executeQuery('GeofenceService.createGeofence.geofence.create', () =>
      this.prisma.geofence.create({
        data,
      }),
    );
  }

  async getGeofencesForDevice(imei: string): Promise<Geofence[]> {
    return this.prisma.executeQuery('GeofenceService.getGeofencesForDevice.geofence.findMany', () =>
      this.prisma.geofence.findMany({
        where: {
          deviceImei: imei,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
  }

  async deleteGeofence(id: number): Promise<void> {
    await this.prisma.executeQuery('GeofenceService.deleteGeofence.geofence.delete', () =>
      this.prisma.geofence.delete({
        where: { id },
      }),
    );

    for (const insideSet of this.deviceInsideGeofences.values()) {
      insideSet.delete(id);
    }
  }

  async checkGeofences(imei: string, lat: number, lng: number): Promise<void> {
    const geofences = await this.prisma.executeQuery(
      'GeofenceService.checkGeofences.geofence.findMany',
      () =>
        this.prisma.geofence.findMany({
          where: {
            deviceImei: imei,
            isActive: true,
          },
        }),
    );

    const previouslyInside = this.deviceInsideGeofences.get(imei) ?? new Set<number>();
    const currentlyInside = new Set<number>();

    for (const geofence of geofences) {
      const distanceMeters = this.haversine(lat, lng, geofence.centerLat, geofence.centerLng);
      const isInside = distanceMeters <= geofence.radiusMeters;
      const wasInside = previouslyInside.has(geofence.id);

      if (isInside) {
        currentlyInside.add(geofence.id);
      }

      if (!wasInside && isInside) {
        await this.createAndEmitAlert({
          geofence,
          imei,
          type: 'entered',
          lat,
          lng,
        });
      }

      if (wasInside && !isInside) {
        await this.createAndEmitAlert({
          geofence,
          imei,
          type: 'exited',
          lat,
          lng,
        });
      }
    }

    this.deviceInsideGeofences.set(imei, currentlyInside);
  }

  async getAlerts(imei: string, limit = 50): Promise<GeofenceAlert[]> {
    const take = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;

    return this.prisma.executeQuery('GeofenceService.getAlerts.geofenceAlert.findMany', () =>
      this.prisma.geofenceAlert.findMany({
        where: { deviceImei: imei },
        orderBy: { triggeredAt: 'desc' },
        take,
      }),
    );
  }

  private async createAndEmitAlert(args: {
    geofence: Geofence;
    imei: string;
    type: GeofenceTransitionType;
    lat: number;
    lng: number;
  }): Promise<void> {
    const triggeredAt = new Date();

    await this.prisma.executeQuery('GeofenceService.createAndEmitAlert.geofenceAlert.create', () =>
      this.prisma.geofenceAlert.create({
        data: {
          geofenceId: args.geofence.id,
          deviceImei: args.imei,
          type: args.type,
          latitude: args.lat,
          longitude: args.lng,
          triggeredAt,
        },
      }),
    );

    this.locationGateway.emitGeofenceAlert(args.imei, {
      geofenceName: args.geofence.name,
      type: args.type,
      triggeredAt,
    });
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRadians = (value: number): number => (value * Math.PI) / 180;
    const earthRadiusMeters = 6371000;

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
  }
}
