import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApiDocumentation } from './shared/http/openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApiDocumentation(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
