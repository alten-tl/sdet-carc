import { Module } from '@nestjs/common';
import { AppointmentsService } from './application/appointments/appointments.service';
import { API_CONFIG, ApiConfig } from './config/api-config';
import { AppointmentsController } from './inbound/http/appointments.controller';
import { AwsInvokeCommandGateway } from './outbound/lambda/aws-invoke-command-gateway';
import { COMMAND_GATEWAY } from './application/ports/command-gateway.port';

@Module({
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    {
      provide: COMMAND_GATEWAY,
      inject: [API_CONFIG],
      useFactory: (config: ApiConfig) =>
        new AwsInvokeCommandGateway({
          functionName: config.lambdaFunctionName,
          region: config.awsRegion,
          endpoint: config.lambdaEndpoint,
        }),
    },
  ],
})
export class ApiModule {}
