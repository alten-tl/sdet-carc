import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehiclesTable1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "vin" varchar(17) NOT NULL,
        "plates" varchar(16) NOT NULL,
        "color" varchar(64) NOT NULL,
        "year" integer NOT NULL,
        "model" varchar(120) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_vehicles_vin" UNIQUE ("vin"),
        CONSTRAINT "uq_vehicles_plates" UNIQUE ("plates"),
        CONSTRAINT "chk_vehicles_year" CHECK ("year" BETWEEN 1900 AND 2100)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
