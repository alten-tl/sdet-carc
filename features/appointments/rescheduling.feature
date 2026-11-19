Feature: Update the date of an existing appointment
  The API reschedules an appointment to another time slot as long as the
  slot is free and the appointment is still enabled.

  Background:
    Given a client with the time zone "America/Mexico_City"
    And a vehicle

  Scenario: Reschedule an appointment to another date and time
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is rescheduled to "2026-01-21" at "15:00"
    Then the response status is 200
    And the appointment date is "2026-01-21"
    And the appointment time is "15:00"
    And the appointment status is "HABILITADA"
    And the appointment is stored from "2026-01-21T21:00:00.000Z" to "2026-01-21T22:00:00.000Z"

  Scenario: Reschedule an appointment to another date keeping its time
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is rescheduled to the date "2026-01-21"
    Then the response status is 200
    And the appointment date is "2026-01-21"
    And the appointment time is "10:00"

  Scenario: Reschedule an appointment to another time keeping its date
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is rescheduled to the time "15:00"
    Then the response status is 200
    And the appointment date is "2026-01-20"
    And the appointment time is "15:00"

  Scenario: Reject a reschedule to a time slot that is already taken
    Given an appointment scheduled on "2026-01-21" at "15:00"
    And an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is rescheduled to "2026-01-21" at "15:00"
    Then the response status is 409
    And the response error code is "SLOT_NOT_AVAILABLE"
    And the response content type is "application/problem+json"
    And the problem title is "The time slot is already taken"

  Scenario: Reject the reschedule of an appointment that does not exist
    When the appointment "99999999-9999-4999-8999-999999999999" is rescheduled to "2026-01-21" at "15:00"
    Then the response status is 404
    And the response error code is "APPOINTMENT_NOT_FOUND"

  Scenario: Reject the reschedule of an appointment that is already cancelled
    Given a cancelled appointment stored on "2026-01-20" at "10:00"
    When the appointment is rescheduled to "2026-01-21" at "15:00"
    Then the response status is 409
    And the response error code is "APPOINTMENT_ALREADY_CANCELLED"

  Scenario: Reject a reschedule without a date and without a time
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is rescheduled without a date and without a time
    Then the response status is 400
    And the response error code is "INVALID_PAYLOAD"
