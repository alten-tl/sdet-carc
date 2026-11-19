Feature: List the appointments scheduled on a date

  Background:
    Given a client with the time zone "America/Mexico_City"
    And a vehicle

  Scenario: List the appointments scheduled on the requested date
    Given an appointment scheduled on "2026-01-20" at "10:00"
    And an appointment scheduled on "2026-01-20" at "11:00"
    When the appointments of "2026-01-20" are listed
    Then the response status is 200
    And the response contains 2 appointments
    And the appointments are listed in time order

  Scenario: Return an empty list when no appointment is scheduled on that date
    Given an appointment scheduled on "2026-01-20" at "10:00"
    When the appointments of "2026-01-25" are listed
    Then the response status is 200
    And the response contains 0 appointments
