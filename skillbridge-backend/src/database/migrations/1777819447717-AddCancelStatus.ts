import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelStatus1777819447717 implements MigrationInterface {
  name = 'AddCancelStatus1777819447717';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."match_requests_status_enum" RENAME TO "match_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ALTER COLUMN "status" TYPE "public"."match_requests_status_enum" USING "status"::"text"::"public"."match_requests_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."match_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."sessions_status_enum" RENAME TO "sessions_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_status_enum" AS ENUM('NEGOTIATING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'REVIEWED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "public"."sessions_status_enum" USING "status"::"text"::"public"."sessions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'NEGOTIATING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_status_enum_old" AS ENUM('NEGOTIATING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'REVIEWED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "public"."sessions_status_enum_old" USING "status"::"text"::"public"."sessions_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'NEGOTIATING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."sessions_status_enum_old" RENAME TO "sessions_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_requests_status_enum_old" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ALTER COLUMN "status" TYPE "public"."match_requests_status_enum_old" USING "status"::"text"::"public"."match_requests_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."match_requests_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."match_requests_status_enum_old" RENAME TO "match_requests_status_enum"`,
    );
  }
}
