Feature: The database refuses overlapping appointments
  The exclusion constraint is the last line of defence of the time slot
  rule: two enabled appointments can never overlap, even when they are
  stored at the same time.

  Background:
    Given a client with the time zone "America/Mexico_City"
    And a vehicle

  Scenario: Reject an appointment that overlaps an enabled appointment already stored
    Given an enabled appointment stored on "2026-01-20" at "10:00"
    When another enabled appointment is stored on "2026-01-20" at "10:30"
    Then the second appointment is rejected with the code "SLOT_NOT_AVAILABLE"

  Scenario: Accept an appointment that starts when the stored one ends
    Given an enabled appointment stored on "2026-01-20" at "10:00"
    When another enabled appointment is stored on "2026-01-20" at "11:00"
    Then the second appointment is stored
