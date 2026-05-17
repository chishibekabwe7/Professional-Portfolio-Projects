import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../generated/prisma/client';

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
  private readonly slowQueryThresholdMs: number;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 100;
  private connectionHealthy = false;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required in environment variables.');
    }

    super({
      adapter: new PrismaMariaDb(databaseUrl),
      log: [{ emit: 'event', level: 'query' }],
    });

    PrismaService.instanceCount += 1;
    this.instanceId = PrismaService.instanceCount;
    this.queryTimeoutMs = this.getQueryTimeoutMs();
    this.slowQueryThresholdMs = this.getSlowQueryThresholdMs();
    this.registerSlowQueryLogger();

    this.logger.log(
      `[instance:${this.instanceId}] PrismaService initialized for ${this.getConnectionTarget(
        databaseUrl,
      )}. queryTimeoutMs=${this.queryTimeoutMs}, slowQueryThresholdMs=${this.slowQueryThresholdMs}, maxRetries=${this.maxRetries}`,
    );

    if (PrismaService.instanceCount > 1) {
      this.logger.warn(
        `[instance:${this.instanceId}] Multiple PrismaService instances detected (${PrismaService.instanceCount}).`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`[instance:${this.instanceId}] Connecting to database...`);
    const connectStartMs = Date.now();
    
    try {
      await this.executeQueryWithRetry('prisma.$connect', () => this.$connect());
      this.connectionHealthy = true;
      const connectTimeMs = Date.now() - connectStartMs;
      
      this.logger.log(
        `[instance:${this.instanceId}] Database connection established (${connectTimeMs}ms).`,
      );
    } catch (error) {
      this.logger.error(
        `[instance:${this.instanceId}] Failed to connect to database: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log(`[instance:${this.instanceId}] Disconnecting database client...`);
    this.connectionHealthy = false;
    
    try {
      await this.executeQuery('prisma.$disconnect', () => this.$disconnect());
      this.logger.log(`[instance:${this.instanceId}] Database client disconnected.`);
    } catch (error) {
      this.logger.warn(
        `[instance:${this.instanceId}] Error disconnecting: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Execute query with automatic retry on transient errors
   */
  async executeQueryWithRetry<T>(
    label: string,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeQuery(label, queryFn, attempt, this.maxRetries);
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          break;
        }

        const isTransient = this.isTransientError(error);
        if (!isTransient) {
          throw error;
        }

        const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[PrismaQuery:retry] ${label} (attempt ${attempt}/${this.maxRetries}) - retrying in ${delayMs}ms: ${this.getErrorMessage(error)}`,
        );
        
        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  /**
   * Execute query with timeout enforcement
   */
  async executeQuery<T>(
    label: string,
    queryFn: () => Promise<T>,
    attempt: number = 1,
    maxAttempts: number = 1,
  ): Promise<T> {
    const startTime = Date.now();
    const attemptSuffix = maxAttempts > 1 ? ` [${attempt}/${maxAttempts}]` : '';
    this.logger.log(`[PrismaQuery:start] ${label}${attemptSuffix}`);

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
        this.logger.log(`[PrismaQuery:done] ${label}${attemptSuffix} (${durationMs}ms)`);
        return outcome.value;
      }

      if (outcome.type === 'error') {
        this.logger.error(
          `[PrismaQuery:error] ${label}${attemptSuffix} (${durationMs}ms): ${this.getErrorMessage(
            outcome.error,
          )}`,
        );
        throw outcome.error;
      }

      this.logger.error(
        `[PrismaQuery:timeout] ${label}${attemptSuffix} exceeded ${this.queryTimeoutMs}ms.`,
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

  private isTransientError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return true;
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('econnrefused') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('connect failed') ||
        message.includes('socket hang up') ||
        message.includes('connection timeout')
      );
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getQueryTimeoutMs(): number {
    const fromEnv = Number(process.env.PRISMA_QUERY_TIMEOUT_MS);

    if (!Number.isFinite(fromEnv) || fromEnv <= 0) {
      return 10000;
    }

    return Math.floor(fromEnv);
  }

  private getSlowQueryThresholdMs(): number {
    const fromEnv = Number(process.env.PRISMA_SLOW_QUERY_MS);

    if (!Number.isFinite(fromEnv) || fromEnv <= 0) {
      return 500;
    }

    return Math.floor(fromEnv);
  }

  private registerSlowQueryLogger(): void {
    const prismaWithQueryEvents = this as unknown as PrismaClient<'query'>;

    prismaWithQueryEvents.$on('query', (event: Prisma.QueryEvent) => {
      if (event.duration <= this.slowQueryThresholdMs) {
        return;
      }

      this.logger.warn(
        `[PrismaQuery:slow] durationMs=${event.duration} thresholdMs=${this.slowQueryThresholdMs} target=${event.target} query=${event.query} params=${event.params}`,
      );
    });
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