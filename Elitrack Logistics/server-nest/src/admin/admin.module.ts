import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../auth/auth.guard';
import { getJwtConfig } from '../auth/jwt.config';
import { RolesGuard } from '../auth/roles.guard';
import { AdminDbRoleGuard } from './admin-db-role.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

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
  controllers: [AdminController],
  providers: [AdminService, AuthGuard, RolesGuard, AdminDbRoleGuard],
})
export class AdminModule {}