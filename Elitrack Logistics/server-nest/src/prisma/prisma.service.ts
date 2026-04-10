import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

type PrismaQueryOutcome<T> =
  | { type: 'result'; value: T }
  | { type: 'error'; error: unknown }
  | { type: 'timeout' };

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static instanceCount = 0;

  private readonly logger = new Logger(PrismaService.name);
  private readonly instanceId: number;
  private readonly queryTimeoutMs: number;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required in environment variables.');
    }

    super({
      adapter: new PrismaMariaDb(databaseUrl),
    });

    PrismaService.instanceCount += 1;
    this.instanceId = PrismaService.instanceCount;
    this.queryTimeoutMs = this.getQueryTimeoutMs();

    this.logger.log(
      `[instance:${this.instanceId}] PrismaService initialized for ${this.getConnectionTarget(
        databaseUrl,
      )}. queryTimeoutMs=${this.queryTimeoutMs}`,
    );

    if (PrismaService.instanceCount > 1) {
      this.logger.warn(
        `[instance:${this.instanceId}] Multiple PrismaService instances detected (${PrismaService.instanceCount}).`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`[instance:${this.instanceId}] Connecting to database...`);
    await this.executeQuery('prisma.$connect', () => this.$connect());
    this.logger.log(`[instance:${this.instanceId}] Database connection established.`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log(`[instance:${this.instanceId}] Disconnecting database client...`);
    await this.executeQuery('prisma.$disconnect', () => this.$disconnect());
    this.logger.log(`[instance:${this.instanceId}] Database client disconnected.`);
  }

  async executeQuery<T>(
    label: string,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.log(`[PrismaQuery:start] ${label}`);

    const queryPromise: Promise<PrismaQueryOutcome<T>> = queryFn()
      .then((value): PrismaQueryOutcome<T> => ({ type: 'result', value }))
      .catch((error: unknown) => ({ type: 'error', error }));

    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise: Promise<PrismaQueryOutcome<T>> = new Promise(
      (resolve) => {
        timeoutHandle = setTimeout(
          () => resolve({ type: 'timeout' }),
          this.queryTimeoutMs,
        );
      },
    );

    try {
      const outcome = await Promise.race([queryPromise, timeoutPromise]);
      const durationMs = Date.now() - startTime;

      if (outcome.type === 'result') {
        this.logger.log(`[PrismaQuery:done] ${label} (${durationMs}ms)`);
        return outcome.value;
      }

      if (outcome.type === 'error') {
        this.logger.error(
          `[PrismaQuery:error] ${label} (${durationMs}ms): ${this.getErrorMessage(
            outcome.error,
          )}`,
        );
        throw outcome.error;
      }

      this.logger.error(
        `[PrismaQuery:timeout] ${label} exceeded ${this.queryTimeoutMs}ms.`,
      );
      throw new Error(
        `Database query timeout (${label}) after ${this.queryTimeoutMs}ms`,
      );
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private getQueryTimeoutMs(): number {
    const fromEnv = Number(process.env.PRISMA_QUERY_TIMEOUT_MS);

    if (!Number.isFinite(fromEnv) || fromEnv <= 0) {
      return 10000;
    }

    return Math.floor(fromEnv);
  }

  private getConnectionTarget(databaseUrl: string): string {
    try {
      const url = new URL(databaseUrl);
      const host = url.hostname || 'unknown-host';
      const port = url.port || 'default-port';
      const databaseName = url.pathname.replace(/^\/+/, '') || 'unknown-db';
      return `${host}:${port}/${databaseName}`;
    } catch {
      return 'unparsed-database-url';
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}