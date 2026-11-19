import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointmentsTable1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "appointment_status" AS ENUM ('HABILITADA', 'DESHABILITADA')
    `);

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "appointment_date" date NOT NULL,
        "start_time" time NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "comments" text,
        "status" "appointment_status" NOT NULL DEFAULT 'HABILITADA',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_appointments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_appointments_client" FOREIGN KEY ("client_id")
          REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "fk_appointments_vehicle" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "chk_appointments_slot" CHECK ("ends_at" > "starts_at")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_appointments_date_time" ON "appointments" ("appointment_date", "start_time")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_appointments_starts_at" ON "appointments" ("starts_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_appointments_client_id" ON "appointments" ("client_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_appointments_vehicle_id" ON "appointments" ("vehicle_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_appointments_status" ON "appointments" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "appointment_status"`);
  }
}
