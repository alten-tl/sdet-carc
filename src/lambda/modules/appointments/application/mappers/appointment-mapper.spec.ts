import { Appointment } from '../../domain/appointment';
import { toAppointmentDto } from './appointment-mapper';

const buildAppointment = (
  status: 'HABILITADA' | 'DESHABILITADA' = 'HABILITADA',
): Appointment =>
  new Appointment({
    id: '33333333-3333-4333-8333-333333333333',
    clientId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    date: '2026-01-20',
    time: '10:00',
    startsAt: new Date('2026-01-20T16:00:00.000Z'),
    endsAt: new Date('2026-01-20T17:00:00.000Z'),
    status,
    comments: 'First visit',
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
  });

describe('toAppointmentDto', () => {
  it('maps the appointment to the published contract', () => {
    expect(toAppointmentDto(buildAppointment())).toEqual({
      id: '33333333-3333-4333-8333-333333333333',
      clientId: '11111111-1111-4111-8111-111111111111',
      vehicleId: '22222222-2222-4222-8222-222222222222',
      date: '2026-01-20',
      time: '10:00',
      status: 'HABILITADA',
      comments: 'First visit',
      createdAt: '2026-01-10T12:00:00.000Z',
      updatedAt: '2026-01-10T12:00:00.000Z',
    });
  });

  it('keeps the disabled status of a cancelled appointment', () => {
    expect(toAppointmentDto(buildAppointment('DESHABILITADA')).status).toBe(
      'DESHABILITADA',
    );
  });
});
