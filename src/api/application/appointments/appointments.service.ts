import { Inject, Injectable } from '@nestjs/common';
import {
  AppointmentListSchema,
  AppointmentSchema,
  CREATE_APPOINTMENT_PAYLOAD_SCHEMA,
  LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA,
} from '@contracts/appointments';
import type { CreateAppointmentPayload } from '@contracts/appointments';
import { AppointmentListResponseSchema } from '@api/contracts/appointments.response';
import type { AppointmentListResponse } from '@api/contracts/appointments.response';
import { AppointmentResponseSchema } from '@api/contracts/appointments.response';
import type { AppointmentResponse } from '@api/contracts/appointments.response';
import { COMMAND_GATEWAY } from '@api/application/ports/command-gateway.port';
import type { CommandGateway } from '@api/application/ports/command-gateway.port';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(COMMAND_GATEWAY)
    private readonly commandGateway: CommandGateway,
  ) {}

  async listByDate(date: string): Promise<AppointmentListResponse> {
    const data = await this.commandGateway.execute(
      {
        type: 'appointments.list',
        payload: LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA.parse({ date }),
      },
      AppointmentListSchema,
    );

    return AppointmentListResponseSchema.parse(data);
  }

  async create(payload: CreateAppointmentPayload): Promise<AppointmentResponse> {
    const data = await this.commandGateway.execute(
      {
        type: 'appointments.create',
        payload: CREATE_APPOINTMENT_PAYLOAD_SCHEMA.parse(payload),
      },
      AppointmentSchema,
    );

    return AppointmentResponseSchema.parse(data);
  }
}
