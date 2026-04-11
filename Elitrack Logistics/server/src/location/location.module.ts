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