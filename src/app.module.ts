import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { ApiConfigModule } from './api/config/api-config.module';

@Module({
  imports: [ApiConfigModule, ApiModule],
})
export class AppModule {}
