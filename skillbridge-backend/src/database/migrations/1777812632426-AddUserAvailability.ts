import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAvailability1777812632426 implements MigrationInterface {
  name = 'AddUserAvailability1777812632426';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portfolios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" character varying, "url" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'other', "skillId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_488aa6e9b219d1d9087126871ae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "availability" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isGuest" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "p1Completed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "p2Completed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" ADD "checkpoints" jsonb`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "roadmap" text`);
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD "suggestedResources" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolios" ADD CONSTRAINT "FK_e7d697a2603c9b97612aed95284" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portfolios" DROP CONSTRAINT "FK_e7d697a2603c9b97612aed95284"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN "suggestedResources"`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "roadmap"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "checkpoints"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "p2Completed"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "p1Completed"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isGuest"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "availability"`);
    await queryRunner.query(`DROP TABLE "portfolios"`);
  }
}
