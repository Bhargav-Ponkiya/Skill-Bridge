import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkillSnapshots1777808412113 implements MigrationInterface {
  name = 'AddSkillSnapshots1777808412113';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "match_requests" ADD "offeredSkillSnapshot" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" ADD "wantedSkillSnapshot" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "match_requests" DROP COLUMN "wantedSkillSnapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_requests" DROP COLUMN "offeredSkillSnapshot"`,
    );
  }
}
