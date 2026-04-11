import { Injectable, NotFoundException } from '@nestjs/common';
import { LocationLog, Trip } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationGateway } from './location.gateway';

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
