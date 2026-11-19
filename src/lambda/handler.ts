import {
  APPOINTMENTS_COMMAND_SCHEMA,
  AppointmentListSchema,
  AppointmentSchema,
} from '@contracts/appointments';
import { CommandResult } from '@contracts/protocol/command-contracts';
import { toAppointmentDto } from '@lambda/modules/appointments/application/mappers/appointment-mapper';
import { DomainError } from '@lambda/modules/appointments/domain/errors';
import { getAppointmentsContainer } from './container';

const extractCommandPayload = (event: unknown): unknown => {
  if (
    typeof event === 'object' &&
    event !== null &&
    'body' in event &&
    typeof (event as { body?: unknown }).body === 'string'
  ) {
    const body = (event as { body: string }).body;

    if (body.length === 0) {
      return {};
    }

    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }

  return event;
};

export const appointmentsLambdaHandler = async (
  event: unknown,
): Promise<CommandResult> => {
  const command = APPOINTMENTS_COMMAND_SCHEMA.safeParse(
    extractCommandPayload(event),
  );

  if (!command.success) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'The command payload is not valid.',
        details: command.error.issues,
      },
    };
  }

  try {
    const container = await getAppointmentsContainer();

    switch (command.data.type) {
      case 'appointments.list': {
        const appointments = await container.listAppointmentsByDate.execute(
          command.data.payload,
        );

        return {
          ok: true,
          data: AppointmentListSchema.parse({
            items: appointments.map(toAppointmentDto),
          }),
        };
      }

      case 'appointments.create': {
        const appointment = await container.createAppointment.execute(
          command.data.payload,
        );

        return {
          ok: true,
          data: AppointmentSchema.parse(toAppointmentDto(appointment)),
        };
      }

      case 'appointments.reschedule': {
        const appointment = await container.rescheduleAppointment.execute(
          command.data.payload,
        );

        return {
          ok: true,
          data: AppointmentSchema.parse(toAppointmentDto(appointment)),
        };
      }
    }
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected error while handling the command.',
      },
    };
  }
};
