Feature: Cancel an existing appointment
  Cancelling an appointment disables it, refreshes its update date and
  releases the time slot so another appointment can take it.

  Background:
    Given a client with the time zone "America/Mexico_City"
    And a vehicle

  Scenario: Cancel an enabled appointment
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is cancelled
    Then the response status is 200
    And the appointment status is "DESHABILITADA"
    And the appointment date is "2026-01-20"
    And the appointment time is "10:00"

  Scenario: Release the time slot of a cancelled appointment
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is cancelled
    And the client schedules an appointment on "2026-01-20" at "10:00"
    Then the response status is 201
    And the appointment status is "HABILITADA"

  Scenario: Reject the cancellation of an appointment that does not exist
    When the appointment "99999999-9999-4999-8999-999999999999" is cancelled
    Then the response status is 404
    And the response error code is "APPOINTMENT_NOT_FOUND"
    And the response content type is "application/problem+json"
    And the problem title is "The appointment does not exist"

  Scenario: Reject the cancellation of an appointment that is already cancelled
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is cancelled
    And the appointment is cancelled again
    Then the response status is 409
    And the response error code is "APPOINTMENT_ALREADY_CANCELLED"
    And the problem title is "The appointment is already cancelled"

  Scenario: List a cancelled appointment with its disabled status
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointment is cancelled
    And the appointments of "2026-01-20" are listed
    Then the response status is 200
    And the response contains 1 appointments
    And the first listed appointment status is "DESHABILITADA"
