# Full File Contents: Driver Scoring + Fleet Dashboard

Generated from workspace files after implementation.

## server/prisma/schema.prisma

~~~prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
}

model admin_audit_logs {
  id            Int       @id @default(autoincrement())
  admin_user_id Int
  action        String    @db.VarChar(120)
  entity_type   String?   @db.VarChar(80)
  entity_id     Int?
  details_json  Json?
  ip_address    String?   @db.VarChar(80)
  user_agent    String?   @db.VarChar(255)
  created_at    DateTime? @default(now()) @db.Timestamp(0)
  users         users     @relation(fields: [admin_user_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "admin_audit_logs_ibfk_1")

  @@index([admin_user_id], map: "admin_user_id")
}

model audit_logs {
  id         Int       @id @default(autoincrement())
  user_id    Int
  action     String    @db.VarChar(120)
  target_id  Int?
  created_at DateTime? @default(now()) @db.Timestamp(0)
  users      users     @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "audit_logs_ibfk_1")

  @@index([user_id], map: "user_id")
}

model bookings {
  id                  Int                   @id @default(autoincrement())
  user_id             Int
  vehicle_id          Int?
  booking_ref         String                @unique(map: "booking_ref") @db.VarChar(20)
  truck_type          String                @db.VarChar(100)
  truck_price_per_day Int
  units               Int                   @default(1)
  days                Int                   @default(1)
  hub                 String                @db.VarChar(255)
  security_tier       String                @db.VarChar(100)
  security_price      Int                   @default(0)
  total_amount        Int
  status              bookings_status?      @default(pending_review)
  notes               String?               @db.Text
  dispatcher_name     String?               @db.VarChar(255)
  eta                 DateTime?             @db.DateTime(0)
  status_notes        String?               @db.Text
  created_at          DateTime?             @default(now()) @db.Timestamp(0)
  updated_at          DateTime?             @default(now()) @db.Timestamp(0)
  users               users                 @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "bookings_ibfk_1")
  vehicles            vehicles?             @relation(fields: [vehicle_id], references: [id], onDelete: SetNull, onUpdate: Cascade)
  fleet_telemetry     fleet_telemetry[]
  notification_events notification_events[]
  transactions        transactions[]

  @@index([user_id], map: "user_id")
  @@index([vehicle_id], map: "idx_bookings_vehicle_id")
}

model vehicles {
  id               Int        @id @default(autoincrement())
  user_id          Int
  category         String     @default("other") @db.VarChar(60)
  vehicle_name     String     @db.VarChar(120)
  plate_number     String     @db.VarChar(30)
  tracking_enabled Boolean    @default(true)
  created_at       DateTime?  @default(now()) @db.Timestamp(0)
  users            users      @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  bookings         bookings[]

  @@unique([user_id, plate_number], map: "uniq_user_plate")
  @@index([user_id], map: "idx_vehicles_user_id")
  @@index([user_id, created_at], map: "idx_vehicles_user_created_at")
}

model fleet_telemetry {
  id          Int       @id @default(autoincrement())
  booking_id  Int
  truck_id    String    @db.VarChar(20)
  latitude    Decimal?  @db.Decimal(10, 7)
  longitude   Decimal?  @db.Decimal(10, 7)
  speed       Int?      @default(0)
  status      String?   @default("TRACKING") @db.VarChar(50)
  recorded_at DateTime? @default(now()) @db.Timestamp(0)
  bookings    bookings  @relation(fields: [booking_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "fleet_telemetry_ibfk_1")

  @@index([booking_id], map: "booking_id")
}

model notification_events {
  id              Int                         @id @default(autoincrement())
  booking_id      Int?
  user_id         Int?
  channel         notification_events_channel
  event_type      String                      @db.VarChar(64)
  recipient       String?                     @db.VarChar(255)
  status          notification_events_status
  provider        String?                     @db.VarChar(50)
  message_subject String?                     @db.VarChar(255)
  message_text    String?                     @db.Text
  error_text      String?                     @db.Text
  created_at      DateTime?                   @default(now()) @db.Timestamp(0)
  bookings        bookings?                   @relation(fields: [booking_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "notification_events_ibfk_1")
  users           users?                      @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "notification_events_ibfk_2")

  @@index([booking_id], map: "booking_id")
  @@index([user_id], map: "user_id")
}

model password_reset_tokens {
  id         Int       @id @default(autoincrement())
  user_id    Int
  token      String    @unique(map: "token") @db.VarChar(255)
  expires_at DateTime  @db.DateTime(0)
  used       Boolean?  @default(false)
  created_at DateTime? @default(now()) @db.Timestamp(0)
  users      users     @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "password_reset_tokens_ibfk_1")

  @@index([token], map: "idx_token")
  @@index([user_id, expires_at], map: "idx_user_expires")
}

model transactions {
  id             Int                  @id @default(autoincrement())
  booking_id     Int
  user_id        Int
  amount         Int
  currency       String?              @default("ZMW") @db.VarChar(10)
  payment_method String?              @default("pending") @db.VarChar(50)
  status         transactions_status? @default(pending)
  reference      String?              @db.VarChar(100)
  created_at     DateTime?            @default(now()) @db.Timestamp(0)
  bookings       bookings             @relation(fields: [booking_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "transactions_ibfk_1")
  users          users                @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "transactions_ibfk_2")

  @@index([booking_id], map: "booking_id")
  @@index([user_id], map: "user_id")
}

model users {
  id                    Int                     @id @default(autoincrement())
  email                 String                  @unique(map: "email") @db.VarChar(255)
  password              String                  @db.VarChar(255)
  role                  users_role              @default(user)
  phone                 String?                 @db.VarChar(50)
  full_name             String?                 @db.VarChar(255)
  company               String?                 @db.VarChar(255)
  created_at            DateTime?               @default(now()) @db.Timestamp(0)
  admin_audit_logs      admin_audit_logs[]
  audit_logs            audit_logs[]
  bookings              bookings[]
  vehicles              vehicles[]
  notification_events   notification_events[]
  password_reset_tokens password_reset_tokens[]
  transactions          transactions[]
}

model TrackerDevice {
  id         Int           @id @default(autoincrement())
  imei       String        @unique
  label      String
  ownerId    String
  isActive   Boolean       @default(true)
  lastSeenAt DateTime?
  createdAt  DateTime      @default(now())
  locations  LocationLog[]
}

model LocationLog {
  id         Int           @id @default(autoincrement())
  deviceId   String
  latitude   Float
  longitude  Float
  speed      Int           @default(0)
  altitude   Float         @default(0)
  recordedAt DateTime      @default(now())
  device     TrackerDevice @relation(fields: [deviceId], references: [imei])

  @@index([deviceId, recordedAt])
}

model EngineCommand {
  id          Int      @id @default(autoincrement())
  deviceImei  String
  action      String
  requestedBy String
  success     Boolean
  sentAt      DateTime @default(now())

  @@index([deviceImei, sentAt])
}

model Geofence {
  id           Int             @id @default(autoincrement())
  deviceImei   String
  name         String
  centerLat    Float
  centerLng    Float
  radiusMeters Int
  isActive     Boolean         @default(true)
  createdAt    DateTime        @default(now())
  alerts       GeofenceAlert[]

  @@index([deviceImei])
}

model GeofenceAlert {
  id          Int      @id @default(autoincrement())
  geofenceId  Int
  deviceImei  String
  type        String
  latitude    Float
  longitude   Float
  triggeredAt DateTime @default(now())
  geofence    Geofence @relation(fields: [geofenceId], references: [id])

  @@index([deviceImei, triggeredAt])
}

model SpeedAlert {
  id          Int      @id @default(autoincrement())
  deviceImei  String
  speed       Int
  limitKmh    Int
  latitude    Float
  longitude   Float
  triggeredAt DateTime @default(now())

  @@index([deviceImei, triggeredAt])
}

model IdleAlert {
  id              Int      @id @default(autoincrement())
  deviceImei      String
  startedAt       DateTime
  endedAt         DateTime?
  durationSeconds Int      @default(0)
  latitude        Float
  longitude       Float

  @@index([deviceImei, startedAt])
}

model DeviceSettings {
  id                   Int    @id @default(autoincrement())
  deviceImei           String @unique
  speedLimitKmh        Int    @default(80)
  idleThresholdMinutes Int    @default(5)
}

model Trip {
  id           Int      @id @default(autoincrement())
  deviceImei   String
  startedAt    DateTime
  endedAt      DateTime?
  distanceKm   Float    @default(0)
  durationSecs Int      @default(0)
  avgSpeedKmh  Float    @default(0)
  maxSpeedKmh  Float    @default(0)
  startLat     Float
  startLng     Float
  endLat       Float?
  endLng       Float?
  isComplete   Boolean  @default(false)

  @@index([deviceImei, startedAt])
}

model DailyScore {
  id              Int      @id @default(autoincrement())
  deviceImei      String
  date            DateTime
  score           Int
  speedViolations Int      @default(0)
  idleMinutes     Int      @default(0)
  totalKm         Float    @default(0)
  totalTrips      Int      @default(0)
  harshEvents     Int      @default(0)

  @@unique([deviceImei, date])
  @@index([deviceImei, date])
}

enum users_role {
  super_admin
  admin
  user
}

enum notification_events_channel {
  email
  sms
  whatsapp
}

enum notification_events_status {
  sent
  failed
  skipped
}

enum transactions_status {
  pending
  paid
  failed
  refunded
}

enum bookings_status {
  pending_review
  approved
  dispatched
  in_transit
  completed
}

~~~

## server/src/location/score.service.ts

~~~ts
import { Injectable } from '@nestjs/common';
import { DailyScore } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ScoreEventType = 'speed_violation' | 'idle' | 'harsh_brake';

@Injectable()
export class ScoreService {
  private readonly harshBrakeMap = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    imei: string,
    eventType: ScoreEventType,
    date: Date,
  ): Promise<void> {
    const day = this.toDayStart(date);
    const dailyScore = await this.ensureDailyScore(imei, day);

    let speedViolations = dailyScore.speedViolations;
    let idleMinutes = dailyScore.idleMinutes;
    let harshEvents = dailyScore.harshEvents;

    if (eventType === 'speed_violation') {
      speedViolations += 1;
    }

    if (eventType === 'idle') {
      idleMinutes += 1;
    }

    if (eventType === 'harsh_brake') {
      harshEvents += 1;
    }

    const score = this.calculateScore(speedViolations, idleMinutes, harshEvents);

    await this.prisma.executeQuery('ScoreService.recordEvent.dailyScore.update', () =>
      this.prisma.dailyScore.update({
        where: { id: dailyScore.id },
        data: {
          speedViolations,
          idleMinutes,
          harshEvents,
          score,
        },
      }),
    );
  }

  async checkHarshBrake(
    imei: string,
    speed: number,
    timestamp: Date,
  ): Promise<void> {
    const currentSpeed = Number.isFinite(speed) ? speed : 0;
    const previousSpeed = this.harshBrakeMap.get(imei);

    if (previousSpeed !== undefined && previousSpeed - currentSpeed > 20) {
      await this.recordEvent(imei, 'harsh_brake', timestamp);
    }

    this.harshBrakeMap.set(imei, currentSpeed);
  }

  async getDailyScores(imei: string, days = 30): Promise<DailyScore[]> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (safeDays - 1));
    const from = this.toDayStart(startDate);

    return this.prisma.executeQuery('ScoreService.getDailyScores.dailyScore.findMany', () =>
      this.prisma.dailyScore.findMany({
        where: {
          deviceImei: imei,
          date: {
            gte: from,
          },
        },
        orderBy: {
          date: 'asc',
        },
      }),
    );
  }

  async getTodayScore(imei: string): Promise<DailyScore | null> {
    const today = this.toDayStart(new Date());

    return this.prisma.executeQuery('ScoreService.getTodayScore.dailyScore.findUnique', () =>
      this.prisma.dailyScore.findUnique({
        where: {
          deviceImei_date: {
            deviceImei: imei,
            date: today,
          },
        },
      }),
    );
  }

  async getAllDevicesLatestScore(imeis: string[]): Promise<Map<string, DailyScore>> {
    const scoreMap = new Map<string, DailyScore>();

    if (imeis.length === 0) {
      return scoreMap;
    }

    const rows = await this.prisma.executeQuery('ScoreService.getAllDevicesLatestScore.dailyScore.findMany', () =>
      this.prisma.dailyScore.findMany({
        where: {
          deviceImei: {
            in: imeis,
          },
        },
        orderBy: [
          { deviceImei: 'asc' },
          { date: 'desc' },
        ],
      }),
    );

    for (const row of rows) {
      if (!scoreMap.has(row.deviceImei)) {
        scoreMap.set(row.deviceImei, row);
      }
    }

    return scoreMap;
  }

  async recordTripSummary(imei: string, date: Date, distanceKm: number): Promise<void> {
    const day = this.toDayStart(date);
    const dailyScore = await this.ensureDailyScore(imei, day);

    await this.prisma.executeQuery('ScoreService.recordTripSummary.dailyScore.update', () =>
      this.prisma.dailyScore.update({
        where: { id: dailyScore.id },
        data: {
          totalTrips: dailyScore.totalTrips + 1,
          totalKm: dailyScore.totalKm + Math.max(0, Number(distanceKm) || 0),
        },
      }),
    );
  }

  private async ensureDailyScore(imei: string, day: Date): Promise<DailyScore> {
    const existing = await this.prisma.executeQuery('ScoreService.ensureDailyScore.dailyScore.findUnique', () =>
      this.prisma.dailyScore.findUnique({
        where: {
          deviceImei_date: {
            deviceImei: imei,
            date: day,
          },
        },
      }),
    );

    if (existing) {
      return existing;
    }

    return this.prisma.executeQuery('ScoreService.ensureDailyScore.dailyScore.create', () =>
      this.prisma.dailyScore.create({
        data: {
          deviceImei: imei,
          date: day,
          score: 100,
        },
      }),
    );
  }

  private calculateScore(speedViolations: number, idleMinutes: number, harshEvents: number): number {
    const speedPenalty = Math.min(speedViolations * 5, 30);
    const idlePenalty = Math.min(idleMinutes, 20);
    const harshPenalty = Math.min(harshEvents * 8, 24);

    return Math.max(0, 100 - speedPenalty - idlePenalty - harshPenalty);
  }

  private toDayStart(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }
}

~~~

## server/src/location/alert.service.ts

~~~ts
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

~~~

## server/src/location/location.service.ts

~~~ts
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { LocationLog, TrackerDevice } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TcpGpsServer } from '../tcp/tcp.server';
import { AlertService } from './alert.service';
import { GeofenceService } from './geofence.service';
import { LocationGateway, LocationUpdatePayload } from './location.gateway';
import { ScoreService } from './score.service';
import { TripService } from './trip.service';

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
    private readonly alertService: AlertService,
    private readonly scoreService: ScoreService,
    private readonly tripService: TripService,
    @Inject(forwardRef(() => TcpGpsServer))
    private readonly tcpGpsServer: TcpGpsServer,
  ) {}

  async handleDeviceUpdate(
    imei: string,
    data: LocationUpdatePayload,
  ): Promise<void> {
    this.locationGateway.broadcast(imei, data);

    await this.tripService.processLocation(imei, {
      lat: data.latitude,
      lng: data.longitude,
      speed: data.speed,
      timestamp: data.timestamp,
    });

    await this.scoreService.checkHarshBrake(imei, data.speed, data.timestamp);

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
    await this.alertService.checkSpeed(imei, data.speed, data.latitude, data.longitude);
    await this.alertService.checkIdle(imei, data.speed, data.latitude, data.longitude);

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
~~~

## server/src/location/location.controller.ts

~~~ts
import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { JwtTokenPayload } from '../auth/auth.service';
import { AlertService } from './alert.service';
import { GeofenceService } from './geofence.service';
import { LocationService } from './location.service';
import { ScoreService } from './score.service';
import { TripService } from './trip.service';

interface AuthenticatedRequest {
  user?: JwtTokenPayload;
}

interface RegisterDeviceBody {
  imei: string;
  label: string;
}

interface CreateGeofenceBody {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

interface UpdateDeviceSettingsBody {
  speedLimitKmh?: number;
  idleThresholdMinutes?: number;
}

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly geofenceService: GeofenceService,
    private readonly alertService: AlertService,
    private readonly scoreService: ScoreService,
    private readonly tripService: TripService,
  ) {}

  @Get('devices')
  async getDevices(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.locationService.getAllDevices(String(userId));
  }

  @Get('fleet/scores')
  async getFleetScores(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    const devices = await this.locationService.getAllDevices(String(userId));
    const imeis = devices.map((device) => device.imei);
    const scoreMap = await this.scoreService.getAllDevicesLatestScore(imeis);

    return devices.map((device) => ({
      device,
      score: scoreMap.get(device.imei) ?? null,
    }));
  }

  @Get(':deviceId/history')
  async getHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = this.toPositiveLimit(limit);
    return this.locationService.getHistory(deviceId, parsedLimit);
  }

  @Post('devices/register')
  async registerDevice(
    @Req() req: AuthenticatedRequest,
    @Body() body: RegisterDeviceBody,
  ) {
    const userId = this.getUserId(req);
    return this.locationService.registerDevice({
      imei: body.imei,
      label: body.label,
      ownerId: String(userId),
    });
  }

  @Post(':deviceId/engine/cut')
  async cutEngine(
    @Param('deviceId') deviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);
    return this.locationService.cutEngine(deviceId, String(userId));
  }

  @Post(':deviceId/engine/restore')
  async restoreEngine(
    @Param('deviceId') deviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);
    return this.locationService.restoreEngine(deviceId, String(userId));
  }

  @Get(':deviceId/engine/status')
  async getEngineStatus(@Param('deviceId') deviceId: string) {
    const status = await this.locationService.getEngineStatus(deviceId);
    const latestMeta = await this.locationService.getLatestEngineCommandMeta(deviceId);

    return {
      status,
      lastActionAt: latestMeta.sentAt,
      requestedBy: latestMeta.requestedBy,
    };
  }

  @Post(':deviceId/geofences')
  async createGeofence(
    @Param('deviceId') deviceId: string,
    @Body() body: CreateGeofenceBody,
  ) {
    return this.geofenceService.createGeofence({
      deviceImei: deviceId,
      name: body.name,
      centerLat: Number(body.centerLat),
      centerLng: Number(body.centerLng),
      radiusMeters: Math.floor(Number(body.radiusMeters)),
    });
  }

  @Get(':deviceId/geofences')
  async getGeofences(@Param('deviceId') deviceId: string) {
    return this.geofenceService.getGeofencesForDevice(deviceId);
  }

  @Delete(':deviceId/geofences/:id')
  async deleteGeofence(
    @Param('id', ParseIntPipe) geofenceId: number,
  ) {
    await this.geofenceService.deleteGeofence(geofenceId);

    return {
      success: true,
      id: geofenceId,
    };
  }

  @Get(':deviceId/geofences/alerts')
  async getGeofenceAlerts(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.geofenceService.getAlerts(deviceId, this.toPositiveAlertLimit(limit));
  }

  @Get(':deviceId/alerts/speed')
  async getSpeedAlerts(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertService.getRecentSpeedAlerts(
      deviceId,
      this.toPositiveAlertLimit(limit),
    );
  }

  @Get(':deviceId/alerts/idle')
  async getIdleAlerts(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertService.getRecentIdleAlerts(
      deviceId,
      this.toPositiveAlertLimit(limit),
    );
  }

  @Put(':deviceId/settings')
  async updateDeviceSettings(
    @Param('deviceId') deviceId: string,
    @Body() body: UpdateDeviceSettingsBody,
  ) {
    return this.alertService.updateSettings(deviceId, {
      ...(body.speedLimitKmh !== undefined
        ? { speedLimitKmh: Number(body.speedLimitKmh) }
        : {}),
      ...(body.idleThresholdMinutes !== undefined
        ? { idleThresholdMinutes: Number(body.idleThresholdMinutes) }
        : {}),
    });
  }

  @Get(':deviceId/settings')
  async getDeviceSettings(@Param('deviceId') deviceId: string) {
    return this.alertService.getSettings(deviceId);
  }

  @Get(':deviceId/score/today')
  async getTodayScore(@Param('deviceId') deviceId: string) {
    return this.scoreService.getTodayScore(deviceId);
  }

  @Get(':deviceId/score/history')
  async getScoreHistory(
    @Param('deviceId') deviceId: string,
    @Query('days') days?: string,
  ) {
    return this.scoreService.getDailyScores(deviceId, this.toPositiveScoreDays(days));
  }

  @Get(':deviceId/trips')
  async getTrips(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = this.toPositiveTripLimit(limit);
    return this.tripService.getTrips(deviceId, parsedLimit);
  }

  @Get(':deviceId/trips/:tripId/replay')
  async getTripReplay(
    @Param('deviceId') deviceId: string,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    const trip = await this.tripService.getTripById(tripId);

    if (trip.deviceImei !== deviceId) {
      throw new ForbiddenException('Trip does not belong to this device');
    }

    const locations = await this.tripService.getTripLocations(tripId);

    return {
      trip,
      locations,
    };
  }

  private getUserId(req: AuthenticatedRequest): number {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return userId;
  }

  private toPositiveLimit(rawLimit?: string): number {
    if (!rawLimit) {
      return 500;
    }

    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 500;
    }

    return Math.floor(parsed);
  }

  private toPositiveAlertLimit(rawLimit?: string): number {
    if (!rawLimit) {
      return 50;
    }

    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 50;
    }

    return Math.floor(parsed);
  }

  private toPositiveTripLimit(rawLimit?: string): number {
    if (!rawLimit) {
      return 30;
    }

    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 30;
    }

    return Math.floor(parsed);
  }

  private toPositiveScoreDays(rawDays?: string): number {
    if (!rawDays) {
      return 30;
    }

    const parsed = Number(rawDays);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 30;
    }

    return Math.floor(parsed);
  }
}
~~~

## server/src/location/location.module.ts

~~~ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../auth/auth.guard';
import { getJwtConfig } from '../auth/jwt.config';
import { PrismaModule } from '../prisma/prisma.module';
import { TcpModule } from '../tcp/tcp.module';
import { AlertService } from './alert.service';
import { GeofenceService } from './geofence.service';
import { LocationController } from './location.controller';
import { LocationGateway } from './location.gateway';
import { LocationService } from './location.service';
import { ScoreService } from './score.service';
import { TripService } from './trip.service';

const jwtConfig = getJwtConfig();

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => TcpModule),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn as never,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      },
    }),
  ],
  controllers: [LocationController],
  providers: [LocationGateway, LocationService, GeofenceService, AlertService, ScoreService, TripService, AuthGuard],
  exports: [LocationGateway, LocationService, GeofenceService, AlertService, ScoreService, TripService],
})
export class LocationModule {}
~~~

## server/src/location/trip.service.ts

~~~ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationLog, Trip } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationGateway } from './location.gateway';
import { ScoreService } from './score.service';

type ActiveTripState = {
  tripId: number;
  lastLat: number;
  lastLng: number;
  lastMovedAt: Date;
  totalDistanceKm: number;
  maxSpeedKmh: number;
  speedReadings: number[];
};

@Injectable()
export class TripService {
  private readonly activeTripMap = new Map<string, ActiveTripState>();
  private readonly lastTripPersistMap = new Map<string, number>();

  private readonly TRIP_START_SPEED = 5;
  private readonly TRIP_END_IDLE_MS = 300000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationGateway: LocationGateway,
    private readonly scoreService: ScoreService,
  ) {}

  async processLocation(
    imei: string,
    data: {
      lat: number;
      lng: number;
      speed: number;
      timestamp: Date;
    },
  ): Promise<void> {
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    const speed = Number(data.speed);
    const timestamp = new Date(data.timestamp);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Number.isNaN(timestamp.getTime())) {
      return;
    }

    const activeTrip = this.activeTripMap.get(imei);

    if (speed > this.TRIP_START_SPEED && !activeTrip) {
      const createdTrip = await this.prisma.executeQuery('TripService.processLocation.trip.create', () =>
        this.prisma.trip.create({
          data: {
            deviceImei: imei,
            startedAt: timestamp,
            startLat: lat,
            startLng: lng,
          },
        }),
      );

      this.activeTripMap.set(imei, {
        tripId: createdTrip.id,
        lastLat: lat,
        lastLng: lng,
        lastMovedAt: timestamp,
        totalDistanceKm: 0,
        maxSpeedKmh: speed,
        speedReadings: [speed],
      });

      this.lastTripPersistMap.set(imei, timestamp.getTime());
      return;
    }

    if (speed > this.TRIP_START_SPEED && activeTrip) {
      const distanceDeltaKm = this.haversineKm(activeTrip.lastLat, activeTrip.lastLng, lat, lng);

      if (Number.isFinite(distanceDeltaKm) && distanceDeltaKm > 0) {
        activeTrip.totalDistanceKm += distanceDeltaKm;
      }

      activeTrip.lastLat = lat;
      activeTrip.lastLng = lng;
      activeTrip.lastMovedAt = timestamp;
      activeTrip.maxSpeedKmh = Math.max(activeTrip.maxSpeedKmh, speed);
      activeTrip.speedReadings.push(speed);

      const lastPersistedAtMs = this.lastTripPersistMap.get(imei) ?? 0;
      const currentMs = timestamp.getTime();

      if (currentMs - lastPersistedAtMs >= 30000) {
        await this.prisma.executeQuery('TripService.processLocation.trip.updateDebounced', () =>
          this.prisma.trip.update({
            where: { id: activeTrip.tripId },
            data: {
              distanceKm: activeTrip.totalDistanceKm,
              maxSpeedKmh: activeTrip.maxSpeedKmh,
            },
          }),
        );

        this.lastTripPersistMap.set(imei, currentMs);
      }

      return;
    }

    if (speed < this.TRIP_START_SPEED && activeTrip) {
      const idleMs = timestamp.getTime() - activeTrip.lastMovedAt.getTime();

      if (idleMs <= this.TRIP_END_IDLE_MS) {
        return;
      }

      const existingTrip = await this.prisma.executeQuery('TripService.processLocation.trip.findUnique', () =>
        this.prisma.trip.findUnique({
          where: { id: activeTrip.tripId },
        }),
      );

      if (!existingTrip) {
        this.activeTripMap.delete(imei);
        this.lastTripPersistMap.delete(imei);
        return;
      }

      const endedAt = timestamp;
      const durationSecs = Math.max(
        0,
        Math.floor((endedAt.getTime() - existingTrip.startedAt.getTime()) / 1000),
      );
      const avgSpeedKmh =
        activeTrip.speedReadings.length > 0
          ? activeTrip.speedReadings.reduce((sum, item) => sum + item, 0) /
            activeTrip.speedReadings.length
          : 0;

      const completedTrip = await this.prisma.executeQuery('TripService.processLocation.trip.finalize', () =>
        this.prisma.trip.update({
          where: { id: activeTrip.tripId },
          data: {
            endedAt,
            endLat: lat,
            endLng: lng,
            distanceKm: activeTrip.totalDistanceKm,
            durationSecs,
            avgSpeedKmh,
            maxSpeedKmh: activeTrip.maxSpeedKmh,
            isComplete: true,
          },
        }),
      );

      this.activeTripMap.delete(imei);
      this.lastTripPersistMap.delete(imei);

      await this.scoreService.recordTripSummary(
        imei,
        completedTrip.endedAt ?? endedAt,
        completedTrip.distanceKm,
      );

      this.locationGateway.emitTripCompleted(imei, completedTrip);
    }
  }

  async getTrips(imei: string, limit = 30): Promise<Trip[]> {
    const take = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 30;

    return this.prisma.executeQuery('TripService.getTrips.trip.findMany', () =>
      this.prisma.trip.findMany({
        where: {
          deviceImei: imei,
          isComplete: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
        take,
      }),
    );
  }

  async getTripById(tripId: number): Promise<Trip> {
    const trip = await this.prisma.executeQuery('TripService.getTripById.trip.findUnique', () =>
      this.prisma.trip.findUnique({
        where: { id: tripId },
      }),
    );

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async getTripLocations(tripId: number): Promise<LocationLog[]> {
    const trip = await this.getTripById(tripId);

    const replayEndAt = trip.endedAt ?? new Date();

    return this.prisma.executeQuery('TripService.getTripLocations.locationLog.findMany', () =>
      this.prisma.locationLog.findMany({
        where: {
          deviceId: trip.deviceImei,
          recordedAt: {
            gte: trip.startedAt,
            lte: replayEndAt,
          },
        },
        orderBy: {
          recordedAt: 'asc',
        },
      }),
    );
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusKm = 6371;
    const toRadians = (value: number): number => (value * Math.PI) / 180;

    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }
}

~~~

## client/package.json

~~~json
{
  "name": "elitrack-logistics-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^7.2.0",
    "@fortawesome/free-solid-svg-icons": "^7.2.0",
    "@fortawesome/react-fontawesome": "^3.3.0",
    "@react-oauth/google": "^0.13.4",
    "@tanstack/react-query": "^5.97.0",
    "@tanstack/react-query-devtools": "^5.97.0",
    "axios": "^1.6.0",
    "leaflet": "^1.9.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-leaflet": "^4.2.1",
    "react-router-dom": "^6.18.0",
    "react-scripts": "5.0.1",
    "recharts": "^3.8.1",
    "socket.io-client": "^4.8.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run build"
  },
  "proxy": "http://localhost:4001",
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead"
    ],
    "development": [
      "last 1 chrome version"
    ]
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.21",
    "@types/node": "^20.19.39",
    "@types/react": "^18.3.28",
    "@types/react-dom": "^18.3.7",
    "autoprefixer": "^10.4.27",
    "postcss": "^8.5.9",
    "tailwindcss": "^3.4.17",
    "typescript": "^4.9.5"
  }
}

~~~

## client/src/components/ScoreBadge.tsx

~~~tsx
import type { CSSProperties } from 'react';
import './ScoreBadge.css';

type ScoreBadgeProps = {
  score: number;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_MAP: Record<NonNullable<ScoreBadgeProps['size']>, number> = {
  sm: 48,
  md: 64,
  lg: 84,
};

const scoreColor = (score: number): string => {
  if (score >= 90) {
    return '#16a34a';
  }

  if (score >= 70) {
    return '#f59e0b';
  }

  if (score >= 50) {
    return '#f97316';
  }

  return '#ef4444';
};

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(normalizedScore);

  const style = {
    '--score-badge-size': `${SIZE_MAP[size]}px`,
    '--score-badge-color': color,
    '--score-badge-value': `${normalizedScore}`,
  } as CSSProperties;

  return (
    <div className="score-badge" style={style} aria-label={`Driver score ${normalizedScore}`}>
      <div className="score-badge__inner">
        <span className="score-badge__value">{normalizedScore}</span>
      </div>
    </div>
  );
}

~~~

## client/src/components/ScoreBadge.css

~~~css
.score-badge {
  width: var(--score-badge-size);
  height: var(--score-badge-size);
  border-radius: 50%;
  background: conic-gradient(
    var(--score-badge-color) calc(var(--score-badge-value) * 1%),
    rgba(148, 163, 184, 0.32) 0
  );
  display: inline-grid;
  place-items: center;
  padding: 4px;
}

.score-badge__inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.96);
  display: inline-grid;
  place-items: center;
}

.score-badge__value {
  color: #f8fafc;
  font-weight: 800;
  font-size: clamp(12px, calc(var(--score-badge-size) * 0.28), 24px);
  line-height: 1;
}

~~~

## client/src/components/TrackingMap.tsx

~~~tsx
import L, { type DivIcon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import {
    MapContainer,
    Marker,
    Polyline,
    Popup,
    TileLayer,
    useMap,
} from 'react-leaflet';
import api from '../api';
import { useTracker } from '../hooks/useTracker';
import { EngineControl } from './EngineControl';
import { GeofenceLayer } from './GeofenceLayer';
import { ScoreBadge } from './ScoreBadge';
import './TrackingMap.css';

type TrackingMapProps = {
  deviceId: string;
  height?: string;
};

type MapUpdaterProps = {
  currentPosition: {
    lat: number;
    lng: number;
    speed: number;
  } | null;
  enabled: boolean;
};

type ReplayPoint = {
  lat: number;
  lng: number;
};

type PlaybackMapUpdaterProps = {
  isPlaybackMode: boolean;
  playbackLocations: ReplayPoint[] | null;
  playbackIndex: number;
};

type PlaybackSpeed = 1 | 2 | 5;

type TodayScoreResponse = {
  score?: number;
} | null;

const PLAYBACK_SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 5];

const DEFAULT_CENTER: [number, number] = [-12.9667, 28.6333];
const DEFAULT_ZOOM = 13;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapUpdater({ currentPosition, enabled }: MapUpdaterProps): null {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !currentPosition) {
      return;
    }

    map.flyTo([currentPosition.lat, currentPosition.lng], map.getZoom(), {
      animate: true,
      duration: 1,
    });
  }, [currentPosition, enabled, map]);

  return null;
}

function PlaybackMapUpdater({
  isPlaybackMode,
  playbackLocations,
  playbackIndex,
}: PlaybackMapUpdaterProps): null {
  const map = useMap();

  useEffect(() => {
    if (!isPlaybackMode || !playbackLocations || playbackLocations.length === 0) {
      return;
    }

    if (playbackLocations.length === 1) {
      map.flyTo([playbackLocations[0].lat, playbackLocations[0].lng], 16, {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    const bounds = L.latLngBounds(
      playbackLocations.map((point) => [point.lat, point.lng] as [number, number]),
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      animate: true,
    });
  }, [isPlaybackMode, map, playbackLocations]);

  useEffect(() => {
    if (!isPlaybackMode || !playbackLocations || playbackLocations.length === 0) {
      return;
    }

    const point = playbackLocations[Math.min(playbackIndex, playbackLocations.length - 1)];

    map.panTo([point.lat, point.lng], {
      animate: true,
      duration: 0.2,
    });
  }, [isPlaybackMode, map, playbackIndex, playbackLocations]);

  return null;
}

function ExternalFlyToHandler(): null {
  const map = useMap();

  useEffect(() => {
    const onFlyTo = (event: Event): void => {
      const customEvent = event as CustomEvent<{
        lat: number;
        lng: number;
        zoom?: number;
      }>;

      const lat = Number(customEvent.detail?.lat);
      const lng = Number(customEvent.detail?.lng);
      const zoom = Number(customEvent.detail?.zoom);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      map.flyTo([lat, lng], Number.isFinite(zoom) ? zoom : map.getZoom(), {
        animate: true,
        duration: 1,
      });
    };

    window.addEventListener('elitrack:fly-to', onFlyTo as EventListener);

    return () => {
      window.removeEventListener('elitrack:fly-to', onFlyTo as EventListener);
    };
  }, [map]);

  return null;
}

const formatTime = (date: Date | null): string => {
  if (!date) {
    return '--:--:--';
  }

  return date.toLocaleTimeString('en-GB', { hour12: false });
};

export function TrackingMap({ deviceId, height = '100vh' }: TrackingMapProps) {
  const { currentPosition, history, isConnected, lastUpdated } = useTracker(deviceId);
  const [todayScore, setTodayScore] = useState<number>(100);
  const [playbackLocations, setPlaybackLocations] = useState<ReplayPoint[] | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState<boolean>(false);

  const isPlaybackMode = Boolean(playbackLocations && playbackLocations.length > 0);

  useEffect(() => {
    let isMounted = true;

    const fetchTodayScore = async (): Promise<void> => {
      try {
        const response = await api.get<TodayScoreResponse>(`/locations/${deviceId}/score/today`);
        const rawScore = Number(response.data?.score ?? 100);

        if (!isMounted || !Number.isFinite(rawScore)) {
          return;
        }

        setTodayScore(Math.max(0, Math.min(100, Math.round(rawScore))));
      } catch (error) {
        console.error('Failed to load today score:', error);
      }
    };

    void fetchTodayScore();

    const timer = window.setInterval(() => {
      void fetchTodayScore();
    }, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [deviceId]);

  useEffect(() => {
    const onTripPlayback = (event: Event): void => {
      const customEvent = event as CustomEvent<{
        locations?: Array<{
          lat?: number;
          lng?: number;
          latitude?: number;
          longitude?: number;
        }>;
      }>;

      const rawLocations = Array.isArray(customEvent.detail?.locations)
        ? customEvent.detail.locations
        : [];

      const normalizedLocations = rawLocations
        .map((item) => ({
          lat: Number(item.lat ?? item.latitude),
          lng: Number(item.lng ?? item.longitude),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      if (normalizedLocations.length === 0) {
        return;
      }

      setPlaybackLocations(normalizedLocations);
      setPlaybackIndex(0);
      setPlaybackSpeed(1);
      setIsPlaybackPlaying(true);
    };

    window.addEventListener('elitrack:trip-playback', onTripPlayback as EventListener);

    return () => {
      window.removeEventListener('elitrack:trip-playback', onTripPlayback as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isPlaybackMode || !isPlaybackPlaying || !playbackLocations) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlaybackIndex((previous) => {
        const next = previous + playbackSpeed;
        const finalIndex = playbackLocations.length - 1;

        if (next >= finalIndex) {
          setIsPlaybackPlaying(false);
          return finalIndex;
        }

        return next;
      });
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaybackMode, isPlaybackPlaying, playbackLocations, playbackSpeed]);

  const liveIcon: DivIcon = useMemo(
    () =>
      L.divIcon({
        className: 'tracking-marker-wrapper',
        html: `<span class="tracking-marker-dot ${isConnected ? 'is-live' : 'is-offline'}"></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -14],
      }),
    [isConnected],
  );

  const playbackIcon: DivIcon = useMemo(
    () =>
      L.divIcon({
        className: 'tracking-marker-wrapper',
        html: '<span class="tracking-marker-dot is-playback"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -14],
      }),
    [],
  );

  const markerPosition: [number, number] | null = currentPosition
    ? [currentPosition.lat, currentPosition.lng]
    : null;

  const playbackMarkerPoint: [number, number] | null =
    playbackLocations && playbackLocations.length > 0
      ? [
          playbackLocations[Math.min(playbackIndex, playbackLocations.length - 1)].lat,
          playbackLocations[Math.min(playbackIndex, playbackLocations.length - 1)].lng,
        ]
      : null;

  const mapCenter: [number, number] =
    playbackMarkerPoint ?? markerPosition ?? DEFAULT_CENTER;

  const historyPositions: [number, number][] = history.map((point) => [
    point.lat,
    point.lng,
  ]);

  const playbackPositions: [number, number][] = (playbackLocations ?? []).map((point) => [
    point.lat,
    point.lng,
  ]);

  const playbackMaxIndex = Math.max(0, (playbackLocations?.length ?? 1) - 1);

  const onSeekPlayback = (value: number): void => {
    if (!playbackLocations || playbackLocations.length === 0) {
      return;
    }

    const nextIndex = Math.min(Math.max(0, Math.floor(value)), playbackLocations.length - 1);
    setPlaybackIndex(nextIndex);
  };

  const onExitPlayback = (): void => {
    setPlaybackLocations(null);
    setPlaybackIndex(0);
    setPlaybackSpeed(1);
    setIsPlaybackPlaying(false);
  };

  return (
    <div className="tracking-map-wrapper" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!isPlaybackMode && history.length > 1 && (
          <Polyline
            positions={historyPositions}
            pathOptions={{ color: '#1D9E75', weight: 3, opacity: 0.7 }}
          />
        )}

        {isPlaybackMode && playbackPositions.length > 1 && (
          <Polyline
            positions={playbackPositions}
            pathOptions={{ color: '#64748b', weight: 4, opacity: 0.95 }}
          />
        )}

        {!isPlaybackMode && markerPosition && currentPosition && (
          <Marker position={markerPosition} icon={liveIcon}>
            <Popup>
              <div>Device: {deviceId}</div>
              <div>Speed: {currentPosition.speed} km/h</div>
              <div>Last update: {formatTime(lastUpdated)}</div>
            </Popup>
          </Marker>
        )}

        {isPlaybackMode && playbackMarkerPoint && (
          <Marker position={playbackMarkerPoint} icon={playbackIcon}>
            <Popup>
              <div>Playback point</div>
              <div>
                Step {Math.min(playbackIndex + 1, playbackMaxIndex + 1)} / {playbackMaxIndex + 1}
              </div>
            </Popup>
          </Marker>
        )}

        <MapUpdater currentPosition={currentPosition} enabled={!isPlaybackMode} />
        <PlaybackMapUpdater
          isPlaybackMode={isPlaybackMode}
          playbackLocations={playbackLocations}
          playbackIndex={playbackIndex}
        />
        <ExternalFlyToHandler />
        <GeofenceLayer deviceId={deviceId} />
      </MapContainer>

      {!isPlaybackMode && (
        <>
          <div className="tracking-score-overlay">
            <ScoreBadge score={todayScore} size="lg" />
            <span className="tracking-score-overlay__label">Driver Score</span>
          </div>

          <div className="tracking-status-bar">
            <span className={`tracking-badge ${isConnected ? 'is-live' : 'is-offline'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
            <span className="tracking-status-item">
              Speed: {currentPosition?.speed ?? 0} km/h
            </span>
            <span className="tracking-status-item">
              Updated: {formatTime(lastUpdated)}
            </span>
          </div>

          <EngineControl deviceId={deviceId} isDeviceOnline={isConnected} />
        </>
      )}

      {isPlaybackMode && (
        <>
          <div className="playback-banner">PLAYBACK MODE</div>

          <div className="playback-controls">
            <button
              type="button"
              className="playback-controls__button"
              onClick={() => setIsPlaybackPlaying((previous) => !previous)}
            >
              {isPlaybackPlaying ? 'Pause' : 'Play'}
            </button>

            <label className="playback-controls__speed">
              Speed
              <select
                value={playbackSpeed}
                onChange={(event) => {
                  const nextSpeed = Number(event.target.value);

                  if (nextSpeed === 1 || nextSpeed === 2 || nextSpeed === 5) {
                    setPlaybackSpeed(nextSpeed);
                  }
                }}
              >
                {PLAYBACK_SPEED_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}x
                  </option>
                ))}
              </select>
            </label>

            <input
              className="playback-controls__range"
              type="range"
              min={0}
              max={playbackMaxIndex}
              value={Math.min(playbackIndex, playbackMaxIndex)}
              onChange={(event) => {
                onSeekPlayback(Number(event.target.value));
              }}
            />

            <span className="playback-controls__progress">
              {Math.min(playbackIndex + 1, playbackMaxIndex + 1)} / {playbackMaxIndex + 1}
            </span>

            <button
              type="button"
              className="playback-controls__button is-exit"
              onClick={onExitPlayback}
            >
              Exit playback
            </button>
          </div>
        </>
      )}
    </div>
  );
}
~~~

## client/src/components/TrackingMap.css

~~~css
.tracking-map-wrapper {
  position: relative;
  width: 100%;
  min-height: 320px;
}

.tracking-map-wrapper .leaflet-container {
  width: 100%;
  height: 100%;
}

.tracking-status-bar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(15, 17, 23, 0.88);
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.2;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.tracking-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.tracking-badge.is-live {
  background: #1d9e75;
  color: #ffffff;
}

.tracking-badge.is-offline {
  background: #6b7280;
  color: #ffffff;
}

.tracking-status-item {
  white-space: nowrap;
}

.tracking-score-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1300;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.tracking-score-overlay__label {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.86);
  color: #f8fafc;
  font-size: 11px;
  font-weight: 700;
}

.tracking-marker-wrapper {
  background: transparent;
  border: 0;
}

.tracking-marker-dot {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #ffffff;
}

.tracking-marker-dot.is-live {
  background: #1d9e75;
  animation: pulse 1.5s ease-in-out infinite;
}

.tracking-marker-dot.is-offline {
  background: #9ca3af;
}

.tracking-marker-dot.is-playback {
  background: #64748b;
  border-color: #f8fafc;
  animation: none;
}

.playback-banner {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 900;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(71, 85, 105, 0.95);
  color: #f8fafc;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.playback-controls {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 16px;
  z-index: 900;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(2, 6, 23, 0.92);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
  padding: 10px;
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  align-items: center;
  gap: 10px;
}

.playback-controls__button {
  border: 0;
  border-radius: 8px;
  min-height: 34px;
  padding: 0 12px;
  background: #1d9e75;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.playback-controls__button.is-exit {
  background: #334155;
}

.playback-controls__speed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;
}

.playback-controls__speed select {
  min-height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: #0f172a;
  color: #f8fafc;
  padding: 0 8px;
}

.playback-controls__range {
  width: 100%;
}

.playback-controls__progress {
  min-width: 70px;
  color: #cbd5e1;
  font-size: 12px;
  text-align: right;
}

@media (max-width: 900px) {
  .playback-controls {
    grid-template-columns: 1fr 1fr;
  }

  .playback-controls__range {
    grid-column: 1 / -1;
  }

  .playback-controls__progress {
    text-align: left;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.4);
  }

  100% {
    transform: scale(1);
  }
}
~~~

## client/src/pages/DeviceList.tsx

~~~tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { io } from 'socket.io-client';
import api from '../api';
import { ScoreBadge } from '../components/ScoreBadge';
import './DeviceList.css';

type DeviceLocation = {
  id: number;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  recordedAt: string;
};

type TrackerDevice = {
  id: number;
  imei: string;
  label: string;
  ownerId: string;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  locations?: DeviceLocation[];
};

type DailyScore = {
  id: number;
  deviceImei: string;
  date: string;
  score: number;
  speedViolations: number;
  idleMinutes: number;
  totalKm: number;
  totalTrips: number;
  harshEvents: number;
};

type FleetScoreEntry = {
  device: TrackerDevice;
  score: DailyScore | null;
};

type DeviceCard = {
  device: TrackerDevice;
  score: number;
  scoreLabel: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  statusRank: number;
  speed: number;
  lastSeenAt: string | null;
  scoreBorderColor: string;
};

type SocketLocationUpdate = {
  imei: string;
  speed: number;
  timestamp: string | Date;
};

type ChartPoint = {
  dateLabel: string;
  score: number;
  speedViolations: number;
  idleMinutes: number;
  harshEvents: number;
  totalKm: number;
  totalTrips: number;
  fill: string;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const IDLE_SPEED_KMH = 5;

const SOCKET_BASE_URL =
  process.env.REACT_APP_WS_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_NEST_API_URL ||
  'http://localhost:3001';

const SOCKET_NAMESPACE_URL = `${SOCKET_BASE_URL.replace(/\/+$/, '')}/tracking`;

const formatRelativeTime = (isoDate: string | null): string => {
  if (!isoDate) {
    return 'Never';
  }

  const timestamp = new Date(isoDate).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  const deltaMs = Date.now() - timestamp;

  if (deltaMs < 5000) {
    return 'just now';
  }

  const totalSeconds = Math.floor(deltaMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'} ago`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'} ago`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours === 1 ? '' : 's'} ago`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays} day${totalDays === 1 ? '' : 's'} ago`;
};

const scoreColor = (score: number): string => {
  if (score >= 90) {
    return '#16a34a';
  }

  if (score >= 70) {
    return '#f59e0b';
  }

  if (score >= 50) {
    return '#f97316';
  }

  return '#ef4444';
};

const scoreLabel = (score: number): string => {
  if (score >= 90) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Good';
  }

  if (score >= 50) {
    return 'Fair';
  }

  return 'Poor';
};

const statusRankMap: Record<DeviceCard['status'], number> = {
  ONLINE: 0,
  IDLE: 1,
  OFFLINE: 2,
};

const isDeviceFresh = (lastSeenAt: string | null): boolean => {
  if (!lastSeenAt) {
    return false;
  }

  const time = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(time)) {
    return false;
  }

  return Date.now() - time <= ONLINE_WINDOW_MS;
};

function ScoreTooltip(props: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const data = props.payload[0].payload;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: 10,
        padding: '10px 12px',
        color: '#f8fafc',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div>Score: {data.score}</div>
      <div>Speed violations: {data.speedViolations}</div>
      <div>Idle minutes: {data.idleMinutes}</div>
      <div>Harsh brakes: {data.harshEvents}</div>
      <div>Distance: {data.totalKm.toFixed(1)} km</div>
      <div>Trips: {data.totalTrips}</div>
    </div>
  );
}

export default function DeviceList() {
  const navigate = useNavigate();
  const [fleetData, setFleetData] = useState<FleetScoreEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedImei, setSelectedImei] = useState<string>('');
  const [scoreHistory, setScoreHistory] = useState<DailyScore[]>([]);
  const [todayScore, setTodayScore] = useState<DailyScore | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [liveSpeedMap, setLiveSpeedMap] = useState<Record<string, number>>({});
  const [liveSeenMap, setLiveSeenMap] = useState<Record<string, string>>({});

  const fleetImeis = useMemo(
    () => Array.from(new Set(fleetData.map((item) => item.device.imei))),
    [fleetData],
  );

  const fetchFleetScores = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<FleetScoreEntry[]>('/locations/fleet/scores');
      const entries = Array.isArray(response.data) ? response.data : [];
      setFleetData(entries);

      if (entries.length > 0) {
        setSelectedImei((previous) =>
          previous && entries.some((entry) => entry.device.imei === previous)
            ? previous
            : entries[0].device.imei,
        );
      }

      setLiveSpeedMap((previous) => {
        const next = { ...previous };

        for (const entry of entries) {
          if (next[entry.device.imei] === undefined) {
            next[entry.device.imei] = Number(entry.device.locations?.[0]?.speed ?? 0);
          }
        }

        return next;
      });

      setLiveSeenMap((previous) => {
        const next = { ...previous };

        for (const entry of entries) {
          const lastSeenAt = entry.device.lastSeenAt;

          if (lastSeenAt && !next[entry.device.imei]) {
            next[entry.device.imei] = lastSeenAt;
          }
        }

        return next;
      });
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load fleet scores.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFleetScores();

    const timer = window.setInterval(() => {
      void fetchFleetScores();
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (fleetImeis.length === 0) {
      return;
    }

    const socket = io(SOCKET_NAMESPACE_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      for (const imei of fleetImeis) {
        socket.emit('subscribeToTracker', { deviceId: imei });
      }
    });

    socket.on('locationUpdate', (data: SocketLocationUpdate) => {
      const imei = String(data.imei ?? '');

      if (!imei) {
        return;
      }

      const speed = Number(data.speed);
      const timestamp = new Date(data.timestamp);

      setLiveSpeedMap((previous) => ({
        ...previous,
        [imei]: Number.isFinite(speed) ? speed : 0,
      }));

      if (!Number.isNaN(timestamp.getTime())) {
        setLiveSeenMap((previous) => ({
          ...previous,
          [imei]: timestamp.toISOString(),
        }));
      }
    });

    return () => {
      for (const imei of fleetImeis) {
        socket.emit('unsubscribeFromTracker', { deviceId: imei });
      }

      socket.disconnect();
    };
  }, [fleetImeis.join('|')]);

  const sortedCards = useMemo<DeviceCard[]>(() => {
    return fleetData
      .map((entry) => {
        const imei = entry.device.imei;
        const speed = Number(
          liveSpeedMap[imei] ?? entry.device.locations?.[0]?.speed ?? 0,
        );
        const lastSeenAt = liveSeenMap[imei] ?? entry.device.lastSeenAt;
        const score = Math.max(0, Math.min(100, Math.round(entry.score?.score ?? 100)));

        let status: DeviceCard['status'] = 'OFFLINE';

        if (isDeviceFresh(lastSeenAt)) {
          status = speed <= IDLE_SPEED_KMH ? 'IDLE' : 'ONLINE';
        }

        return {
          device: entry.device,
          score,
          scoreLabel: scoreLabel(score),
          status,
          statusRank: statusRankMap[status],
          speed: Number.isFinite(speed) ? speed : 0,
          lastSeenAt,
          scoreBorderColor: scoreColor(score),
        };
      })
      .sort((a, b) => {
        if (a.statusRank !== b.statusRank) {
          return a.statusRank - b.statusRank;
        }

        if (a.score !== b.score) {
          return b.score - a.score;
        }

        return a.device.label.localeCompare(b.device.label);
      });
  }, [fleetData, liveSeenMap, liveSpeedMap]);

  useEffect(() => {
    if (sortedCards.length === 0) {
      return;
    }

    if (!selectedImei || !sortedCards.some((item) => item.device.imei === selectedImei)) {
      setSelectedImei(sortedCards[0].device.imei);
    }
  }, [selectedImei, sortedCards]);

  useEffect(() => {
    if (!selectedImei) {
      setScoreHistory([]);
      setTodayScore(null);
      return;
    }

    let isMounted = true;

    const fetchScoreHistory = async (): Promise<void> => {
      setLoadingHistory(true);

      try {
        const [historyResponse, todayResponse] = await Promise.all([
          api.get<DailyScore[]>(`/locations/${selectedImei}/score/history`, {
            params: { days: 30 },
          }),
          api.get<DailyScore | null>(`/locations/${selectedImei}/score/today`),
        ]);

        if (!isMounted) {
          return;
        }

        setScoreHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
        setTodayScore(todayResponse.data ?? null);
      } catch (historyError) {
        if (!isMounted) {
          return;
        }

        const message = historyError instanceof Error ? historyError.message : 'Failed to load score history.';
        setError(message);
        setScoreHistory([]);
        setTodayScore(null);
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    void fetchScoreHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedImei]);

  const selectedCard = sortedCards.find((card) => card.device.imei === selectedImei) ?? null;

  const chartData = useMemo<ChartPoint[]>(() => {
    return scoreHistory.map((item) => {
      const date = new Date(item.date);
      const dateLabel = Number.isNaN(date.getTime())
        ? 'N/A'
        : date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          });

      const fill = item.score > 80 ? '#16a34a' : item.score >= 60 ? '#f59e0b' : '#ef4444';

      return {
        dateLabel,
        score: Math.max(0, Math.min(100, Math.round(item.score))),
        speedViolations: item.speedViolations,
        idleMinutes: item.idleMinutes,
        harshEvents: item.harshEvents,
        totalKm: item.totalKm,
        totalTrips: item.totalTrips,
        fill,
      };
    });
  }, [scoreHistory]);

  const todayBreakdown = todayScore ?? (scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1] : null);

  return (
    <div className="fleet-page">
      <div className="fleet-shell">
        <header className="fleet-header">
          <div>
            <h1 className="fleet-title">Fleet Overview</h1>
            <div className="fleet-subtitle">
              Live device status and driver behaviour scoring across your fleet.
            </div>
          </div>

          <button
            type="button"
            className="fleet-refresh-btn"
            onClick={() => {
              void fetchFleetScores();
            }}
          >
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="fleet-state">Loading fleet dashboard...</div>
        ) : sortedCards.length === 0 ? (
          <div className="fleet-state">No fleet devices found.</div>
        ) : (
          <section className="fleet-grid">
            {sortedCards.map((card) => (
              <article
                key={card.device.id}
                className={`fleet-card ${selectedImei === card.device.imei ? 'is-selected' : ''}`}
                style={{ borderColor: card.scoreBorderColor }}
                onClick={() => setSelectedImei(card.device.imei)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedImei(card.device.imei);
                  }
                }}
              >
                <div className="fleet-card__header">
                  <div>
                    <h3 className="fleet-card__name">{card.device.label}</h3>
                    <div className="fleet-card__imei">{card.device.imei}</div>
                  </div>

                  <span
                    className={`fleet-status ${
                      card.status === 'ONLINE'
                        ? 'is-online'
                        : card.status === 'IDLE'
                          ? 'is-idle'
                          : 'is-offline'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div className="fleet-card__stats">
                  <div className="fleet-card__speed">Speed: {Math.round(card.speed)} km/h</div>
                  <div className="fleet-card__last-seen">
                    Last seen: {formatRelativeTime(card.lastSeenAt)}
                  </div>
                </div>

                <div className="fleet-card__score">
                  <ScoreBadge score={card.score} size="md" />
                  <div className="fleet-card__score-meta">
                    <span className="fleet-card__score-label">Driver score</span>
                    <span className="fleet-card__score-grade">{card.scoreLabel}</span>
                  </div>
                </div>

                <div className="fleet-card__actions">
                  <button
                    type="button"
                    className="fleet-track-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/track/${card.device.imei}`);
                    }}
                  >
                    Track
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="fleet-chart-card">
          <div>
            <h2 className="fleet-chart-title">
              {selectedCard ? `Score History - ${selectedCard.device.label}` : 'Score History'}
            </h2>
            <div className="fleet-chart-subtitle">Last 30 days</div>
          </div>

          {error && <div className="fleet-subtitle">{error}</div>}

          {loadingHistory ? (
            <div className="fleet-state">Loading score history...</div>
          ) : chartData.length === 0 ? (
            <div className="fleet-state">No score history available for this device.</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                  <XAxis dataKey="dateLabel" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                  <Tooltip content={<ScoreTooltip />} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((item, index) => (
                      <Cell key={`${item.dateLabel}-${index}`} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="fleet-breakdown-grid">
            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Speed violations</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.speedViolations ?? 0}</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Idle time</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.idleMinutes ?? 0} min</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Harsh brakes</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.harshEvents ?? 0}</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Distance</div>
              <div className="fleet-breakdown-value">{(todayBreakdown?.totalKm ?? 0).toFixed(1)} km</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Trips</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.totalTrips ?? 0}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

~~~

## client/src/pages/DeviceList.css

~~~css
.fleet-page {
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at 15% 10%, rgba(21, 128, 61, 0.1), transparent 42%),
    radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.1), transparent 38%),
    #020617;
  color: #f8fafc;
}

.fleet-shell {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.fleet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.fleet-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.fleet-subtitle {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 13px;
}

.fleet-refresh-btn {
  border: 0;
  border-radius: 10px;
  min-height: 38px;
  padding: 0 14px;
  background: #1d9e75;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.fleet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.fleet-card {
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
  padding: 12px;
  display: grid;
  gap: 10px;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.fleet-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 28px rgba(0, 0, 0, 0.34);
}

.fleet-card.is-selected {
  outline: 2px solid rgba(56, 189, 248, 0.65);
  outline-offset: 1px;
}

.fleet-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.fleet-card__name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.fleet-card__imei {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
  word-break: break-all;
}

.fleet-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.fleet-status.is-online {
  background: #16a34a;
  color: #ecfdf5;
}

.fleet-status.is-idle {
  background: #f59e0b;
  color: #422006;
}

.fleet-status.is-offline {
  background: #64748b;
  color: #f8fafc;
}

.fleet-card__stats {
  display: grid;
  gap: 6px;
}

.fleet-card__speed {
  font-size: 13px;
  color: #e2e8f0;
}

.fleet-card__last-seen {
  font-size: 12px;
  color: #94a3b8;
}

.fleet-card__score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fleet-card__score-meta {
  display: grid;
  gap: 3px;
}

.fleet-card__score-label {
  font-size: 11px;
  color: #94a3b8;
}

.fleet-card__score-grade {
  font-size: 13px;
  font-weight: 700;
}

.fleet-card__actions {
  margin-top: 2px;
}

.fleet-track-btn {
  border: 0;
  border-radius: 10px;
  min-height: 34px;
  padding: 0 12px;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.45);
  color: #f8fafc;
  font-weight: 700;
  cursor: pointer;
}

.fleet-chart-card {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(15, 23, 42, 0.94);
  padding: 14px;
  display: grid;
  gap: 12px;
}

.fleet-chart-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.fleet-chart-subtitle {
  color: #94a3b8;
  font-size: 12px;
}

.fleet-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.fleet-breakdown-tile {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.8);
  padding: 10px;
}

.fleet-breakdown-label {
  color: #94a3b8;
  font-size: 11px;
}

.fleet-breakdown-value {
  margin-top: 4px;
  font-size: 17px;
  font-weight: 800;
}

.fleet-state {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.9);
  min-height: 150px;
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-size: 14px;
}

~~~

