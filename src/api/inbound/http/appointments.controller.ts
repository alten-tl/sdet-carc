import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CREATE_APPOINTMENT_PAYLOAD_SCHEMA,
  LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA,
} from '@contracts/appointments';
import type {
  CreateAppointmentPayload,
  ListAppointmentsByDatePayload,
} from '@contracts/appointments';
import { AppointmentsService } from '@api/application/appointments/appointments.service';
import {
  AppointmentListResponseSchema,
  AppointmentResponseSchema,
} from '@api/contracts/appointments.response';
import type {
  AppointmentListResponse,
  AppointmentResponse,
} from '@api/contracts/appointments.response';
import { zodToOpenApi } from '@api/inbound/http/zod-openapi';

@Controller('appointments')
@ApiTags('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the appointments scheduled for a given date',
  })
  @ApiOkResponse({
    description: 'The appointments scheduled on the requested date',
    schema: zodToOpenApi(AppointmentListResponseSchema, 'output'),
  })
  async listByDate(
    @Query({ schema: LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA })
    query: ListAppointmentsByDatePayload,
  ): Promise<AppointmentListResponse> {
    return this.appointmentsService.listByDate(query.date);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Schedule a new appointment for a client',
  })
  @ApiCreatedResponse({
    description: 'The appointment that was scheduled',
    schema: zodToOpenApi(AppointmentResponseSchema, 'output'),
  })
  @ApiConflictResponse({
    description: 'The requested time slot is already taken',
  })
  @ApiNotFoundResponse({
    description: 'The client or the vehicle does not exist',
  })
  @ApiBadRequestResponse({
    description: 'The request payload is not valid',
  })
  async create(
    @Body({ schema: CREATE_APPOINTMENT_PAYLOAD_SCHEMA })
    body: CreateAppointmentPayload,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.create(body);
  }
}
