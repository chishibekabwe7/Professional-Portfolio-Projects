import {
    Body,
    Controller,
    Delete,
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
  ) {}

  @Get('devices')
  async getDevices(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.locationService.getAllDevices(String(userId));
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
}