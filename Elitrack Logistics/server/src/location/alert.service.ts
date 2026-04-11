import { Injectable } from '@nestjs/common';
import {
    DeviceSettings,
    IdleAlert,
    SpeedAlert,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationGateway } from './location.gateway';
import { ScoreService } from './score.service';

type IdleSessionState = {
  startedAt: Date;
  lat: number;
  lng: number;
} | null;

@Injectable()
export class AlertService {
  private readonly lastSpeedAlertMap = new Map<string, number>();
  private readonly idleStartMap = new Map<string, IdleSessionState>();
  private readonly idleScoreMinuteMap = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationGateway: LocationGateway,
    private readonly scoreService: ScoreService,
  ) {}

  async checkSpeed(
    imei: string,
    speedKmh: number,
    lat: number,
    lng: number,
  ): Promise<void> {
    const settings = await this.getSettings(imei);
    const speedLimitKmh = settings.speedLimitKmh ?? 80;
    const now = new Date();

    if (speedKmh <= speedLimitKmh) {
      return;
    }

    const nowMs = now.getTime();
    const lastAlertMs = this.lastSpeedAlertMap.get(imei) ?? 0;

    if (nowMs - lastAlertMs < 60000) {
      return;
    }

    await this.prisma.executeQuery('AlertService.checkSpeed.speedAlert.create', () =>
      this.prisma.speedAlert.create({
        data: {
          deviceImei: imei,
          speed: Math.round(speedKmh),
          limitKmh: speedLimitKmh,
          latitude: lat,
          longitude: lng,
        },
      }),
    );

    this.locationGateway.emitSpeedAlert(imei, {
      speed: Math.round(speedKmh),
      limit: speedLimitKmh,
      lat,
      lng,
    });

    await this.scoreService.recordEvent(imei, 'speed_violation', now);

    this.lastSpeedAlertMap.set(imei, nowMs);
  }

  async checkIdle(
    imei: string,
    speedKmh: number,
    lat: number,
    lng: number,
  ): Promise<void> {
    const now = new Date();
    const idleSession = this.idleStartMap.get(imei) ?? null;

    if (speedKmh < 3) {
      if (!idleSession) {
        this.idleStartMap.set(imei, {
          startedAt: now,
          lat,
          lng,
        });
        this.idleScoreMinuteMap.set(imei, 0);
        return;
      }

      const settings = await this.getSettings(imei);
      const thresholdMinutes = settings.idleThresholdMinutes ?? 5;
      const durationSeconds = Math.floor((now.getTime() - idleSession.startedAt.getTime()) / 1000);

      if (durationSeconds < thresholdMinutes * 60) {
        return;
      }

      const overThresholdMinutes = Math.floor(
        (durationSeconds - thresholdMinutes * 60) / 60,
      );
      const lastRecordedOverThresholdMinutes = this.idleScoreMinuteMap.get(imei) ?? 0;

      if (overThresholdMinutes > lastRecordedOverThresholdMinutes) {
        for (let minute = lastRecordedOverThresholdMinutes; minute < overThresholdMinutes; minute += 1) {
          await this.scoreService.recordEvent(imei, 'idle', now);
        }

        this.idleScoreMinuteMap.set(imei, overThresholdMinutes);
      }

      const existingAlert = await this.prisma.executeQuery(
        'AlertService.checkIdle.idleAlert.findFirst',
        () =>
          this.prisma.idleAlert.findFirst({
            where: {
              deviceImei: imei,
              startedAt: idleSession.startedAt,
            },
            orderBy: {
              id: 'desc',
            },
          }),
      );

      if (existingAlert) {
        return;
      }

      await this.prisma.executeQuery('AlertService.checkIdle.idleAlert.create', () =>
        this.prisma.idleAlert.create({
          data: {
            deviceImei: imei,
            startedAt: idleSession.startedAt,
            latitude: idleSession.lat,
            longitude: idleSession.lng,
            durationSeconds,
          },
        }),
      );

      this.locationGateway.emitIdleAlert(imei, {
        duration: durationSeconds,
        lat: idleSession.lat,
        lng: idleSession.lng,
      });

      return;
    }

    if (!idleSession) {
      return;
    }

    const endedAt = now;
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - idleSession.startedAt.getTime()) / 1000),
    );

    await this.prisma.executeQuery('AlertService.checkIdle.idleAlert.updateMany', () =>
      this.prisma.idleAlert.updateMany({
        where: {
          deviceImei: imei,
          startedAt: idleSession.startedAt,
          endedAt: null,
        },
        data: {
          endedAt,
          durationSeconds,
        },
      }),
    );

    this.idleStartMap.set(imei, null);
    this.idleScoreMinuteMap.delete(imei);
  }

  async updateSettings(
    imei: string,
    settings: {
      speedLimitKmh?: number;
      idleThresholdMinutes?: number;
    },
  ): Promise<DeviceSettings> {
    return this.prisma.executeQuery('AlertService.updateSettings.deviceSettings.upsert', () =>
      this.prisma.deviceSettings.upsert({
        where: { deviceImei: imei },
        update: {
          ...(settings.speedLimitKmh !== undefined
            ? { speedLimitKmh: Math.floor(settings.speedLimitKmh) }
            : {}),
          ...(settings.idleThresholdMinutes !== undefined
            ? { idleThresholdMinutes: Math.floor(settings.idleThresholdMinutes) }
            : {}),
        },
        create: {
          deviceImei: imei,
          speedLimitKmh:
            settings.speedLimitKmh !== undefined ? Math.floor(settings.speedLimitKmh) : 80,
          idleThresholdMinutes:
            settings.idleThresholdMinutes !== undefined
              ? Math.floor(settings.idleThresholdMinutes)
              : 5,
        },
      }),
    );
  }

  async getSettings(imei: string): Promise<DeviceSettings> {
    const settings = await this.prisma.executeQuery(
      'AlertService.getSettings.deviceSettings.findUnique',
      () =>
        this.prisma.deviceSettings.findUnique({
          where: { deviceImei: imei },
        }),
    );

    if (settings) {
      return settings;
    }

    return this.updateSettings(imei, {});
  }

  async getRecentSpeedAlerts(imei: string, limit = 20): Promise<SpeedAlert[]> {
    const take = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;

    return this.prisma.executeQuery('AlertService.getRecentSpeedAlerts.speedAlert.findMany', () =>
      this.prisma.speedAlert.findMany({
        where: { deviceImei: imei },
        orderBy: { triggeredAt: 'desc' },
        take,
      }),
    );
  }

  async getRecentIdleAlerts(imei: string, limit = 20): Promise<IdleAlert[]> {
    const take = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;

    return this.prisma.executeQuery('AlertService.getRecentIdleAlerts.idleAlert.findMany', () =>
      this.prisma.idleAlert.findMany({
        where: { deviceImei: imei },
        orderBy: { startedAt: 'desc' },
        take,
      }),
    );
  }
}
