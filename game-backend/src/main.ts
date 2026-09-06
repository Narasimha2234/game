import './common/dns-fix.js';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  
  // enable CORS for mobile app (Expo) and admin frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
