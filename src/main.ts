import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './api/configure-app';
import { loadApiConfig, loadLocalEnv } from './api/config/api-config';
import { setupApiDocumentation } from './api/inbound/http/openapi';

async function bootstrap() {
  loadLocalEnv();

  const app = await NestFactory.create(AppModule);

  configureApp(app);
  setupApiDocumentation(app);

  await app.listen(loadApiConfig().port);
}
void bootstrap();
