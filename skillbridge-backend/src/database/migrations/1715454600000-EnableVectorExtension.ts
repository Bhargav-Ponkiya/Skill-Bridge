import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableVectorExtension1715454600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  }

  public async down(): Promise<void> {
    // We don't drop the extension in down to avoid breaking other things
  }
}
