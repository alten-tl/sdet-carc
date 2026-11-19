export interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
  contentType: string;
}

export class AppointmentWorld {
  response?: ApiResponse;
  clientId = '';
  vehicleId = '';
}
