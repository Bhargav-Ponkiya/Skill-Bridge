import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableVectorExtension1715454600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // We generally don't drop extensions in down migrations as they might be used elsewhere
    }
}
