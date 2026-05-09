import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkillWiseReviews1778000000000 implements MigrationInterface {
  name = 'AddSkillWiseReviews1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reviews" ADD "skillId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_skillId" ON "reviews" ("skillId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "swappedCount" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "swappedCount"`);
    await queryRunner.query(`DROP INDEX "IDX_reviews_skillId"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "skillId"`);
  }
}
