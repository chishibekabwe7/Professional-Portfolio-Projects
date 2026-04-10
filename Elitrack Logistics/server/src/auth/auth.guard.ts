import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenPayload } from './auth.service';
import { getJwtConfig } from './jwt.config';

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtTokenPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwtConfig = getJwtConfig();

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtTokenPayload>(token, {
        secret: this.jwtConfig.secret,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearerToken(
    headerValue: string | string[] | undefined,
  ): string | null {
    if (Array.isArray(headerValue)) {
      return this.extractBearerToken(headerValue[0]);
    }

    if (!headerValue) {
      return null;
    }

    const [scheme, token] = headerValue.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}