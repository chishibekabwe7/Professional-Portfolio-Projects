import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GoogleOAuthStrategy } from './google-oauth.strategy';
import { getJwtConfig } from './jwt.config';

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
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, GoogleOAuthStrategy],
})
export class AuthModule {}