import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { JwtTokenPayload } from '../auth/auth.service';
import { LocationService } from './location.service';

interface AuthenticatedRequest {
  user?: JwtTokenPayload;
}

interface RegisterDeviceBody {
  imei: string;
  label: string;
}

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

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
}