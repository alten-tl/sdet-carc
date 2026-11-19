export interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
  contentType: string;
}

export class AppointmentWorld {
  response?: ApiResponse;
  responses: ApiResponse[] = [];
  storedError?: unknown;
  appointmentId = '';
  clientId = '';
  vehicleId = '';
}
