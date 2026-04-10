import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import { JwtTokenPayload } from '../auth/auth.service';
import { users_role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

interface RequestWithUser {
  user?: JwtTokenPayload;
}

@Injectable()
export class AdminDbRoleGuard implements CanActivate {
  private readonly logger = new Logger(AdminDbRoleGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.id;

    if (!userId) {
      throw new HttpException({ error: 'Admins only' }, HttpStatus.FORBIDDEN);
    }

    try {
      const user = await this.prisma.executeQuery(
        'AdminDbRoleGuard.users.findUnique',
        () =>
          this.prisma.users.findUnique({
            where: { id: userId },
            select: { role: true },
          }),
      );

      const isAdminRole =
        user?.role === users_role.admin || user?.role === users_role.super_admin;

      if (!isAdminRole) {
        throw new HttpException({ error: 'Admins only' }, HttpStatus.FORBIDDEN);
      }

      if (request.user) {
        request.user.role = user.role;
      }

      return true;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `[canActivate] Failed DB role check for userId=${userId}: ${this.getErrorMessage(error)}`,
      );
      throw new HttpException(
        { error: 'Failed to verify admin role' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unknown error';
  }
}