import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { LocationLog, TrackerDevice } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TcpGpsServer } from '../tcp/tcp.server';
import { GeofenceService } from './geofence.service';
import { LocationGateway, LocationUpdatePayload } from './location.gateway';

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
    private readonly geofenceService: GeofenceService,
    @Inject(forwardRef(() => TcpGpsServer))
    private readonly tcpGpsServer: TcpGpsServer,
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

    await this.geofenceService.checkGeofences(imei, data.latitude, data.longitude);

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

  async cutEngine(
    imei: string,
    requestedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = this.tcpGpsServer.sendCutEngine(imei);

    await this.prisma.executeQuery('LocationService.cutEngine.engineCommand.create', () =>
      this.prisma.engineCommand.create({
        data: {
          deviceImei: imei,
          action: 'cut',
          requestedBy,
          success,
        },
      }),
    );

    if (!success) {
      return { success: false, message: 'Device offline' };
    }

    return { success: true, message: 'Engine cut command sent' };
  }

  async restoreEngine(
    imei: string,
    requestedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = this.tcpGpsServer.sendRestoreEngine(imei);

    await this.prisma.executeQuery('LocationService.restoreEngine.engineCommand.create', () =>
      this.prisma.engineCommand.create({
        data: {
          deviceImei: imei,
          action: 'restored',
          requestedBy,
          success,
        },
      }),
    );

    if (!success) {
      return { success: false, message: 'Device offline' };
    }

    return { success: true, message: 'Engine restore command sent' };
  }

  async getEngineStatus(imei: string): Promise<'cut' | 'restored' | 'unknown'> {
    const latestCommand = await this.prisma.executeQuery(
      'LocationService.getEngineStatus.engineCommand.findFirst',
      () =>
        this.prisma.engineCommand.findFirst({
          where: { deviceImei: imei },
          orderBy: { sentAt: 'desc' },
        }),
    );

    if (!latestCommand) {
      return 'unknown';
    }

    if (latestCommand.action === 'cut') {
      return 'cut';
    }

    if (latestCommand.action === 'restored') {
      return 'restored';
    }

    return 'unknown';
  }

  async getLatestEngineCommandMeta(imei: string): Promise<{
    requestedBy: string | null;
    sentAt: Date | null;
  }> {
    const latestCommand = await this.prisma.executeQuery(
      'LocationService.getLatestEngineCommandMeta.engineCommand.findFirst',
      () =>
        this.prisma.engineCommand.findFirst({
          where: { deviceImei: imei },
          orderBy: { sentAt: 'desc' },
          select: {
            requestedBy: true,
            sentAt: true,
          },
        }),
    );

    if (!latestCommand) {
      return {
        requestedBy: null,
        sentAt: null,
      };
    }

    return latestCommand;
  }
}