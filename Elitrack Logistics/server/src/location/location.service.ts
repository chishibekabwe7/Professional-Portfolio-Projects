import { Injectable, Logger } from '@nestjs/common';
import { LocationLog, TrackerDevice } from '../generated/prisma/client';
import { LocationGateway, LocationUpdatePayload } from './location.gateway';
import { PrismaService } from '../prisma/prisma.service';

type TrackerDeviceWithLatestLocation = TrackerDevice & {
  locations: LocationLog[];
};

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly lastSaveMap = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationGateway: LocationGateway,
  ) {}

  async handleDeviceUpdate(
    imei: string,
    data: LocationUpdatePayload,
  ): Promise<void> {
    this.locationGateway.broadcast(imei, data);

    const now = Date.now();
    const lastSavedAt = this.lastSaveMap.get(imei) ?? 0;
    const shouldPersist = now - lastSavedAt > 5000;

    if (!shouldPersist) {
      return;
    }

    await this.prisma.executeQuery('LocationService.handleDeviceUpdate.$transaction', () =>
      this.prisma.$transaction([
        this.prisma.locationLog.create({
          data: {
            deviceId: imei,
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            recordedAt: data.timestamp,
          },
        }),
        this.prisma.trackerDevice.update({
          where: { imei },
          data: {
            lastSeenAt: data.timestamp,
            isActive: true,
          },
        }),
      ]),
    );

    this.lastSaveMap.set(imei, now);
  }

  async getHistory(deviceId: string, limit = 500): Promise<LocationLog[]> {
    const cappedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 500;

    const rows = await this.prisma.executeQuery('LocationService.getHistory.locationLog.findMany', () =>
      this.prisma.locationLog.findMany({
        where: { deviceId },
        orderBy: { recordedAt: 'desc' },
        take: cappedLimit,
      }),
    );

    return rows.reverse();
  }

  async getAllDevices(ownerId: string): Promise<TrackerDevice[]> {
    const devicesWithLatest = await this.prisma.executeQuery(
      'LocationService.getAllDevices.trackerDevice.findMany',
      () =>
        this.prisma.trackerDevice.findMany({
          where: { ownerId },
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        }),
    );

    return devicesWithLatest as TrackerDeviceWithLatestLocation[] as TrackerDevice[];
  }

  async registerDevice(data: {
    imei: string;
    label: string;
    ownerId: string;
  }): Promise<TrackerDevice> {
    return this.prisma.executeQuery('LocationService.registerDevice.trackerDevice.upsert',
      () =>
        this.prisma.trackerDevice.upsert({
          where: { imei: data.imei },
          update: {
            label: data.label,
            ownerId: data.ownerId,
            isActive: true,
          },
          create: {
            imei: data.imei,
            label: data.label,
            ownerId: data.ownerId,
          },
        }),
    );
  }
}