import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../auth/auth.guard';
import { getJwtConfig } from '../auth/jwt.config';
import { PrismaModule } from '../prisma/prisma.module';
import { LocationController } from './location.controller';
import { LocationGateway } from './location.gateway';
import { LocationService } from './location.service';

const jwtConfig = getJwtConfig();

@Module({
  imports: [
    PrismaModule,
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
  providers: [LocationGateway, LocationService, AuthGuard],
  exports: [LocationGateway, LocationService],
})
export class LocationModule {}