Feature: Schedule an appointment for a client
  The API validates the request, forwards the command to the appointments
  Lambda and rejects the request when the requested time slot is taken.

  Background:
    Given a client with the time zone "America/Mexico_City"
    And a vehicle

  Scenario: Schedule an appointment on an available time slot
    When the client schedules an appointment on "2026-01-20" at "10:00"
    Then the response status is 201
    And the appointment status is "HABILITADA"
    And the appointment is stored from "2026-01-20T16:00:00.000Z" to "2026-01-20T17:00:00.000Z"

  Scenario: Reject an appointment when the exact time slot is already taken
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the client schedules an appointment on "2026-01-20" at "10:00"
    Then the response status is 409
    And the response error code is "SLOT_NOT_AVAILABLE"
    And the response content type is "application/problem+json"
    And the problem type is "https://api.alten.com/problems/slot-not-available"
    And the problem title is "The time slot is already taken"
    And the problem status is 409
    And the problem instance is "/api/v1/appointments"

  Scenario: Reject an appointment that overlaps an existing one
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the client schedules an appointment on "2026-01-20" at "10:30"
    Then the response status is 409
    And the response error code is "SLOT_NOT_AVAILABLE"

  Scenario: Allow an appointment right after the previous one ends
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the client schedules an appointment on "2026-01-20" at "11:00"
    Then the response status is 201

  Scenario: Reject an appointment for a client that does not exist
    When a client with id "99999999-9999-4999-8999-999999999999" schedules an appointment on "2026-01-20" at "10:00"
    Then the response status is 404
    And the response error code is "CLIENT_NOT_FOUND"

  Scenario: Reject an appointment for a vehicle that does not exist
    When the client schedules an appointment on "2026-01-20" at "10:00" with an unknown vehicle
    Then the response status is 404
    And the response error code is "VEHICLE_NOT_FOUND"

  Scenario: Reject an appointment with an invalid payload
    When the client schedules an appointment on "2026-01-20" at "10:00" with an invalid payload
    Then the response status is 400
    And the response error code is "INVALID_PAYLOAD"
    And the response content type is "application/problem+json"
    And the problem title is "The request payload is not valid"
    And the problem status is 400
