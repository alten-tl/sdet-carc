import { QueryFailedError } from 'typeorm';

export const SLOT_OVERLAP_CONSTRAINT = 'ex_appointments_slot_overlap';

const EXCLUSION_VIOLATION = '23P01';

interface DriverError {
  code?: string;
  constraint?: string;
}

export const isSlotOverlapViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as DriverError;

  return (
    driverError.code === EXCLUSION_VIOLATION &&
    driverError.constraint === SLOT_OVERLAP_CONSTRAINT
  );
};
