import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resize the pgvector embedding column from vector(768) → vector(3072).
 *
 * Reason: The `text-embedding-004` and `embedding-001` models were retired
 * by Google in early 2026. The replacement, `gemini-embedding-001`, produces
 * 3072-dimensional vectors. Storing a 3072-d vector in a vector(768) column
 * would cause a dimension mismatch error in pgvector.
 *
 * Existing 768-d embeddings are NULLed out so the startup backfill in
 * SkillService re-generates them with the new model — mixing vectors from
 * different models in the same column produces meaningless cosine distances.
 */
export class UpdateEmbeddingTo30721778430779971 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Clear existing 768-d embeddings (incompatible with the new model).
    await queryRunner.query(`UPDATE "skills" SET "embedding" = NULL`);

    // 2. pgvector does not support ALTER COLUMN … TYPE directly for vector columns,
    //    so we drop and re-add the column with the new dimension.
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN IF EXISTS "embedding"`);
    await queryRunner.query(`ALTER TABLE "skills" ADD COLUMN "embedding" vector(3072)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to vector(768) — existing 3072-d data is lost on rollback.
    await queryRunner.query(`UPDATE "skills" SET "embedding" = NULL`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN IF EXISTS "embedding"`);
    await queryRunner.query(`ALTER TABLE "skills" ADD COLUMN "embedding" vector(768)`);
  }
}
