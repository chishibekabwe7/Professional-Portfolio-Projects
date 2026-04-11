import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type DbHealthResponse = {
  status: 'ok' | 'slow' | 'error';
  latencyMs: number;
};

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getRoot(): object {
    return {
      app: 'Elitrack Logistics API',
      status: 'running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('health/db')
  async getDatabaseHealth(): Promise<DbHealthResponse> {
    const startTime = Date.now();

    try {
      await this.prisma.executeQuery('HealthController.getDatabaseHealth.$queryRaw', () =>
        this.prisma.$queryRaw`SELECT 1`,
      );

      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      if (latencyMs < 100) {
        return { status: 'ok', latencyMs };
      }

      if (latencyMs <= 1000) {
        return { status: 'slow', latencyMs };
      }

      this.logger.warn(
        `[db-health] Query latency exceeded warning threshold: ${latencyMs}ms (>1000ms).`,
      );
      return { status: 'slow', latencyMs };
    } catch (error: unknown) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      this.logger.error(
        `[db-health] Query failed after ${latencyMs}ms: ${this.getErrorMessage(error)}`,
      );

      return {
        status: 'error',
        latencyMs,
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
