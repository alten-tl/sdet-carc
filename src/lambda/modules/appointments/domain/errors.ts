import { APPOINTMENT_ERROR_CODES } from '@contracts/appointments/errors';
import type { AppointmentErrorCode } from '@contracts/appointments/errors';

export class DomainError extends Error {
  constructor(
    readonly code: AppointmentErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class SlotNotAvailableError extends DomainError {
  constructor(details: unknown) {
    super(
      APPOINTMENT_ERROR_CODES.SLOT_NOT_AVAILABLE,
      'The requested time slot is already taken.',
      details,
    );
  }
}

export class ClientNotFoundError extends DomainError {
  constructor(clientId: string) {
    super(
      APPOINTMENT_ERROR_CODES.CLIENT_NOT_FOUND,
      `The client ${clientId} does not exist.`,
      { clientId },
    );
  }
}

export class VehicleNotFoundError extends DomainError {
  constructor(vehicleId: string) {
    super(
      APPOINTMENT_ERROR_CODES.VEHICLE_NOT_FOUND,
      `The vehicle ${vehicleId} does not exist.`,
      { vehicleId },
    );
  }
}

export class AppointmentNotFoundError extends DomainError {
  constructor(appointmentId: string) {
    super(
      APPOINTMENT_ERROR_CODES.APPOINTMENT_NOT_FOUND,
      `The appointment ${appointmentId} does not exist.`,
      { appointmentId },
    );
  }
}

export class AppointmentAlreadyCancelledError extends DomainError {
  constructor(appointmentId: string) {
    super(
      APPOINTMENT_ERROR_CODES.APPOINTMENT_ALREADY_CANCELLED,
      `The appointment ${appointmentId} is already cancelled.`,
      { appointmentId },
    );
  }
}
