import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRole1778425106571 implements MigrationInterface {
    name = 'AddUserRole1778425106571'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_reviews_skillId"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "version" DROP DEFAULT`);
        await queryRunner.query(`CREATE INDEX "IDX_2b1406159ab9d025cfb6e5e289" ON "reviews" ("skillId") `);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_2b1406159ab9d025cfb6e5e289d" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_2b1406159ab9d025cfb6e5e289d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b1406159ab9d025cfb6e5e289"`);
        await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "version" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE INDEX "IDX_reviews_skillId" ON "reviews" ("skillId") `);
    }

}
