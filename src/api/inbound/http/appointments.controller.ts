import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
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
  RESCHEDULE_APPOINTMENT_REQUEST_SCHEMA,
} from '@contracts/appointments';
import type {
  CreateAppointmentPayload,
  ListAppointmentsByDatePayload,
  RescheduleAppointmentRequest,
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
import { problemResponse } from '@api/http/problem-response';

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
  @ApiBadRequestResponse(
    problemResponse('The request payload is not valid'),
  )
  @ApiConflictResponse(
    problemResponse('The requested time slot is already taken'),
  )
  @ApiNotFoundResponse(
    problemResponse('The client or the vehicle does not exist'),
  )
  async create(
    @Body({ schema: CREATE_APPOINTMENT_PAYLOAD_SCHEMA })
    body: CreateAppointmentPayload,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update the date of an existing appointment',
    description:
      'Moves an appointment to another time slot. The appointment keeps its ' +
      'current time when only a date is given, and its current date when ' +
      'only a time is given.',
  })
  @ApiOkResponse({
    description: 'The appointment that was updated',
    schema: zodToOpenApi(AppointmentResponseSchema, 'output'),
  })
  @ApiBadRequestResponse(
    problemResponse('The request payload is not valid'),
  )
  @ApiConflictResponse(
    problemResponse(
      'The requested time slot is already taken or the appointment is already cancelled',
    ),
  )
  @ApiNotFoundResponse(problemResponse('The appointment does not exist'))
  async reschedule(
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: RESCHEDULE_APPOINTMENT_REQUEST_SCHEMA })
    body: RescheduleAppointmentRequest,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.reschedule(id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel an existing appointment',
    description:
      'Cancels an appointment by setting its status to DESHABILITADA and ' +
      'refreshing its update date. The time slot is released, so another ' +
      'appointment can take it.',
  })
  @ApiOkResponse({
    description: 'The appointment that was cancelled',
    schema: zodToOpenApi(AppointmentResponseSchema, 'output'),
  })
  @ApiBadRequestResponse(
    problemResponse('The request payload is not valid'),
  )
  @ApiConflictResponse(
    problemResponse('The appointment is already cancelled'),
  )
  @ApiNotFoundResponse(problemResponse('The appointment does not exist'))
  async cancel(
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.cancel(id);
  }
}
