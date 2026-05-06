import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEndorsements1777831756788 implements MigrationInterface {
    name = 'AddEndorsements1777831756788'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skills" ADD "endorsementsCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "version" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "endorsedSkill" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "endorsedSkill"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "endorsementsCount"`);
    }

}
