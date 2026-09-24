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
