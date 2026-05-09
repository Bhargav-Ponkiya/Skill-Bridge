import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNegotiationChat1777750640999 implements MigrationInterface {
  name = 'AddNegotiationChat1777750640999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD "matchRequestId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_066163c46cda7e8187f96bc87a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_399833392126349ef0b04b9bed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "sessionId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e8fb9c1f95a261596982320fd4" ON "messages" ("matchRequestId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_399833392126349ef0b04b9bed" ON "messages" ("sessionId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_066163c46cda7e8187f96bc87a0" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_1bbc41c60ea50bafdf7d0be195e" FOREIGN KEY ("matchRequestId") REFERENCES "match_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_1bbc41c60ea50bafdf7d0be195e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_066163c46cda7e8187f96bc87a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_399833392126349ef0b04b9bed"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e8fb9c1f95a261596982320fd4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "sessionId" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_399833392126349ef0b04b9bed" ON "messages" ("sessionId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_066163c46cda7e8187f96bc87a0" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "matchRequestId"`,
    );
  }
}
