import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1777275583517 implements MigrationInterface {
  name = 'InitialMigration1777275583517';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."skills_type_enum" AS ENUM('OFFER', 'WANT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."skills_proficiencylevel_enum" AS ENUM('BEGINNER', 'INTERMEDIATE', 'EXPERT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "title" character varying NOT NULL, "description" text, "category" character varying NOT NULL, "type" "public"."skills_type_enum" NOT NULL, "proficiencyLevel" "public"."skills_proficiencylevel_enum", "isActive" boolean NOT NULL DEFAULT true, "embedding" vector(768), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0d3212120f4ecedf90864d7e298" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee1265e76ea0b8c5f7daa85e81" ON "skills" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "passwordHash" character varying, "googleId" character varying, "avatar" character varying, "bio" text, "timezone" character varying, "isVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "match_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fromUserId" uuid NOT NULL, "toUserId" uuid NOT NULL, "offeredSkillId" uuid NOT NULL, "wantedSkillId" uuid NOT NULL, "status" "public"."match_requests_status_enum" NOT NULL DEFAULT 'PENDING', "message" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7349a97326e887defffe4531598" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21eb1f5ebc3a2323978871d468" ON "match_requests" ("fromUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_df35c53e119d1a85082c78290b" ON "match_requests" ("toUserId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_status_enum" AS ENUM('NEGOTIATING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'REVIEWED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sessions_format_enum" AS ENUM('VIDEO', 'TEXT', 'IN_PERSON')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matchRequestId" uuid, "participant1Id" uuid NOT NULL, "participant2Id" uuid NOT NULL, "skill1Id" uuid NOT NULL, "skill2Id" uuid NOT NULL, "status" "public"."sessions_status_enum" NOT NULL DEFAULT 'NEGOTIATING', "scheduledAt" TIMESTAMP, "duration" integer, "format" "public"."sessions_format_enum", "meetingLink" character varying, "summary" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9e76f6602bfd77a60e8088a6d" ON "sessions" ("participant1Id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_20dbc6a6e2c22c34e4431ac22e" ON "sessions" ("participant2Id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "reviewerId" uuid NOT NULL, "revieweeId" uuid NOT NULL, "rating" integer NOT NULL, "comment" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a850a1d2a7c119634df63e8a03" ON "reviews" ("sessionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9238c3e3739dc40322f577fc4" ON "reviews" ("reviewerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8f626e1e943aabb0f90fb8ee6" ON "reviews" ("revieweeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "relatedId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_399833392126349ef0b04b9bed" ON "messages" ("sessionId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ADD CONSTRAINT "FK_21eb1f5ebc3a2323978871d4685" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ADD CONSTRAINT "FK_df35c53e119d1a85082c78290b4" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ADD CONSTRAINT "FK_66cf951844cbafa15fa2872d2e4" FOREIGN KEY ("offeredSkillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ADD CONSTRAINT "FK_30c5feff2277b05480a7e656ba9" FOREIGN KEY ("wantedSkillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_8cfad04716b6cf3be8734e4b301" FOREIGN KEY ("matchRequestId") REFERENCES "match_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_f9e76f6602bfd77a60e8088a6d5" FOREIGN KEY ("participant1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_20dbc6a6e2c22c34e4431ac22ef" FOREIGN KEY ("participant2Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_ae45b1143279314bf8924089054" FOREIGN KEY ("skill1Id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_6fcbd0f84edb242121f1029e7f1" FOREIGN KEY ("skill2Id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_a850a1d2a7c119634df63e8a030" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_f9238c3e3739dc40322f577fc46" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_c8f626e1e943aabb0f90fb8ee61" FOREIGN KEY ("revieweeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_066163c46cda7e8187f96bc87a0" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_066163c46cda7e8187f96bc87a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_c8f626e1e943aabb0f90fb8ee61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_f9238c3e3739dc40322f577fc46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_a850a1d2a7c119634df63e8a030"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_6fcbd0f84edb242121f1029e7f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_ae45b1143279314bf8924089054"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_20dbc6a6e2c22c34e4431ac22ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_f9e76f6602bfd77a60e8088a6d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_8cfad04716b6cf3be8734e4b301"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" DROP CONSTRAINT "FK_30c5feff2277b05480a7e656ba9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" DROP CONSTRAINT "FK_66cf951844cbafa15fa2872d2e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" DROP CONSTRAINT "FK_df35c53e119d1a85082c78290b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" DROP CONSTRAINT "FK_21eb1f5ebc3a2323978871d4685"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_399833392126349ef0b04b9bed"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8f626e1e943aabb0f90fb8ee6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9238c3e3739dc40322f577fc4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a850a1d2a7c119634df63e8a03"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20dbc6a6e2c22c34e4431ac22e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9e76f6602bfd77a60e8088a6d"`,
    );
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_format_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_df35c53e119d1a85082c78290b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21eb1f5ebc3a2323978871d468"`,
    );
    await queryRunner.query(`DROP TABLE "match_requests"`);
    await queryRunner.query(`DROP TYPE "public"."match_requests_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee1265e76ea0b8c5f7daa85e81"`,
    );
    await queryRunner.query(`DROP TABLE "skills"`);
    await queryRunner.query(
      `DROP TYPE "public"."skills_proficiencylevel_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."skills_type_enum"`);
  }
}
