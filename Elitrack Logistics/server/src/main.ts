import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT) || 4001;

  await app.listen(port);
  console.log(`Nest server running on http://localhost:${port}`);
}

void bootstrap();
