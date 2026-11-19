import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentSlotOverlapConstraint1700000003000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "ex_appointments_slot_overlap"
      EXCLUDE USING gist (
        tstzrange("starts_at", "ends_at", '[)') WITH &&
      )
      WHERE ("status" = 'HABILITADA')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointments"
      DROP CONSTRAINT "ex_appointments_slot_overlap"
    `);
  }
}
