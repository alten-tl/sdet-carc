Feature: Slot availability
  The availability of a time slot is a business rule: two enabled
  appointments can never overlap.

  Scenario: A slot that overlaps an enabled appointment is not available
    Given an enabled appointment from "10:00" to "11:00"
    When the availability of the slot from "10:30" to "11:30" is evaluated
    Then the slot is not available

  Scenario: A slot that starts when the previous appointment ends is available
    Given an enabled appointment from "10:00" to "11:00"
    When the availability of the slot from "11:00" to "12:00" is evaluated
    Then the slot is available

  Scenario: A slot that overlaps a disabled appointment is available
    Given a disabled appointment from "10:00" to "11:00"
    When the availability of the slot from "10:30" to "11:30" is evaluated
    Then the slot is available

  Scenario: A slot without any appointment around it is available
    When the availability of the slot from "10:00" to "11:00" is evaluated
    Then the slot is available
