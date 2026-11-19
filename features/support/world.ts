export interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
}

export class AppointmentWorld {
  response?: ApiResponse;
  clientId = '';
  vehicleId = '';
}
