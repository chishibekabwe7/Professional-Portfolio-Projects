import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../auth/auth.guard';
import { getJwtConfig } from '../auth/jwt.config';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

const jwtConfig = getJwtConfig();

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn as never,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      },
    }),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, AuthGuard],
})
export class VehiclesModule {}