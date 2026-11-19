import { AppointmentRepository } from '@lambda/modules/appointments/application/ports/appointment-repository.port';
import { Appointment } from '@lambda/modules/appointments/domain/appointment';
import { ListAppointmentsByDate } from './list-appointments-by-date.use-case';

const buildAppointment = (id: string): Appointment =>
  new Appointment({
    id,
    clientId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    date: '2026-01-15',
    time: '10:00',
    startsAt: new Date('2026-01-15T16:00:00.000Z'),
    endsAt: new Date('2026-01-15T17:00:00.000Z'),
    status: 'HABILITADA',
    comments: null,
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
  });

describe('ListAppointmentsByDate', () => {
  it('returns the appointments scheduled on the requested date', async () => {
    const appointments = [
      buildAppointment('33333333-3333-4333-8333-333333333333'),
    ];
    const findByDate = jest.fn().mockResolvedValue(appointments);
    const repository: AppointmentRepository = { findByDate };

    const useCase = new ListAppointmentsByDate(repository);

    const result = await useCase.execute({ date: '2026-01-15' });

    expect(findByDate).toHaveBeenCalledWith('2026-01-15');
    expect(result).toEqual(appointments);
  });

  it('returns an empty list when no appointment is scheduled on the date', async () => {
    const findByDate = jest.fn().mockResolvedValue([]);
    const repository: AppointmentRepository = { findByDate };

    const useCase = new ListAppointmentsByDate(repository);

    const result = await useCase.execute({ date: '2026-01-20' });

    expect(result).toEqual([]);
  });
});
