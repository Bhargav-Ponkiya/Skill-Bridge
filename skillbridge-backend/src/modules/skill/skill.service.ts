import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, In } from 'typeorm';
import { Skill, SkillType } from './skill.entity';
import { Portfolio } from './portfolio.entity';
import { User } from '../user/user.entity';
import { CreateSkillInput } from './dto/create-skill.input';
import { UpdateSkillInput } from './dto/update-skill.input';
import { UpdatePortfolioInput } from './dto/update-portfolio.input';
import { CursorPaginationInput } from '../../common/dto/cursor-pagination.input';
import { PaginatedSkills, SkillEdge } from './dto/paginated-skills.output';
import { AddPortfolioInput } from './dto/add-portfolio.input';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SkillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Backfill embeddings for any skill rows that are missing them. Runs once on boot, low
   * concurrency so we don't blow through the Gemini free quota in a burst. Skipped silently
   * when the API isn't reachable — the recommender falls back to category match.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const orphans = await this.skillRepository.find({
        where: { embedding: IsNull() as any, isActive: true },
        take: 50,
      });
      if (orphans.length === 0) return;
      this.logger.log(`Backfilling embeddings for ${orphans.length} skill(s)…`);
      for (const skill of orphans) {
        try {
          const embedding = await this.aiService.generateEmbedding(
            this.embeddableText(skill),
          );
          if (embedding) {
            skill.embedding = embedding as any;
            await this.skillRepository.save(skill);
          }
        } catch (err) {
          this.logger.warn(
            `Embedding skipped for skill ${skill.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Embedding backfill skipped: ${(err as Error).message}`);
    }
  }

  private embeddableText(skill: {
    title: string;
    description?: string | null;
    category?: string | null;
  }): string {
    return [skill.title, skill.category, skill.description]
      .filter(Boolean)
      .join(' — ');
  }

  private async attachEmbedding(skill: Skill): Promise<void> {
    try {
      const embedding = await this.aiService.generateEmbedding(
        this.embeddableText(skill),
      );
      if (embedding) {
        skill.embedding = embedding as any;
      }
    } catch (err) {
      this.logger.warn(`Could not embed skill: ${(err as Error).message}`);
    }
  }

  private async assertNotGuest(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['isGuest'],
    });
    if (user?.isGuest) {
      throw new ForbiddenException(
        'Guest accounts cannot perform this action. Please register first.',
      );
    }
  }

  async createSkill(userId: string, input: CreateSkillInput): Promise<Skill> {
    await this.assertNotGuest(userId);
    const skill = this.skillRepository.create({
      ...input,
      userId,
    });
    await this.attachEmbedding(skill);
    return this.skillRepository.save(skill);
  }

  async updateSkill(
    userId: string,
    id: string,
    input: UpdateSkillInput,
  ): Promise<Skill> {
    await this.assertNotGuest(userId);
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill)
      throw new NotFoundException(
        'Skill not found or you do not have permission.',
      );

    const titleChanged =
      input.title !== undefined && input.title !== skill.title;
    const descChanged =
      input.description !== undefined &&
      input.description !== skill.description;
    const categoryChanged =
      input.category !== undefined && input.category !== skill.category;

    Object.assign(skill, input);

    // Re-embed only when the semantic content actually changed.
    if (titleChanged || descChanged || categoryChanged) {
      await this.attachEmbedding(skill);
    }

    return this.skillRepository.save(skill);
  }

  async toggleSkillActive(userId: string, id: string): Promise<Skill> {
    await this.assertNotGuest(userId);
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill)
      throw new NotFoundException(
        'Skill not found or you do not have permission.',
      );

    skill.isActive = !skill.isActive;
    return this.skillRepository.save(skill);
  }

  async deleteSkill(userId: string, id: string): Promise<boolean> {
    await this.assertNotGuest(userId);
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill)
      throw new NotFoundException(
        'Skill not found or you do not have permission.',
      );

    // Prevent deletion if the skill is in any active exchange
    const activeRequestCount = await this.skillRepository.manager.query(
      `SELECT COUNT(*)::int AS count FROM match_requests
       WHERE ("offeredSkillId" = $1 OR "wantedSkillId" = $1)
         AND status = 'PENDING'`,
      [id],
    );
    const activeSessionCount = await this.skillRepository.manager.query(
      `SELECT COUNT(*)::int AS count FROM sessions
       WHERE ("skill1Id" = $1 OR "skill2Id" = $1)
         AND status IN ('NEGOTIATING', 'SCHEDULED', 'ACTIVE')`,
      [id],
    );

    if (activeRequestCount[0]?.count > 0 || activeSessionCount[0]?.count > 0) {
      throw new BadRequestException(
        'Cannot delete a skill that is part of an active exchange. Deactivate it instead.',
      );
    }

    await this.skillRepository.remove(skill);
    return true;
  }

  async mySkills(userId: string): Promise<Skill[]> {
    return this.skillRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findSkillsByUserId(userId: string): Promise<Skill[]> {
    return this.skillRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async searchSkills(
    currentUserId: string,
    query?: string,
    category?: string,
    type?: string,
    pagination: CursorPaginationInput = { limit: 20 },
  ): Promise<PaginatedSkills> {
    const qb = this.skillRepository
      .createQueryBuilder('skill')
      .leftJoinAndSelect('skill.user', 'user')
      .where('skill.isActive = :active', { active: true })
      .andWhere('skill.userId != :uid', { uid: currentUserId });

    if (query && query.trim()) {
      qb.andWhere(
        '(LOWER(skill.title) LIKE :q OR LOWER(skill.description) LIKE :q)',
        { q: `%${query.toLowerCase()}%` },
      );
    }

    if (category && category !== 'All') {
      qb.andWhere('skill.category = :category', { category });
    }

    if (type && (type === SkillType.OFFER || type === SkillType.WANT)) {
      qb.andWhere('skill.type = :type', { type });
    }

    // Cursor-based: fetch one extra to determine if there's a next page.
    const limit = pagination.limit + 1;

    if (pagination.cursor) {
      const cursorDate = new Date(
        Buffer.from(pagination.cursor, 'base64').toString('utf-8'),
      );
      qb.andWhere('skill."createdAt" < :cursor', { cursor: cursorDate });
    }

    const items = await qb
      .orderBy('skill.createdAt', 'DESC')
      .take(limit)
      .getMany();

    const hasNextPage = items.length > pagination.limit;
    const pageItems = hasNextPage ? items.slice(0, -1) : items;

    // Get total count for display purposes (not required for cursor pagination but useful).
    const countQb = this.skillRepository
      .createQueryBuilder('skill')
      .where('skill.isActive = :active', { active: true })
      .andWhere('skill.userId != :uid', { uid: currentUserId });

    if (query && query.trim()) {
      countQb.andWhere(
        '(LOWER(skill.title) LIKE :q OR LOWER(skill.description) LIKE :q)',
        { q: `%${query.toLowerCase()}%` },
      );
    }
    if (category && category !== 'All') {
      countQb.andWhere('skill.category = :category', { category });
    }
    if (type && (type === SkillType.OFFER || type === SkillType.WANT)) {
      countQb.andWhere('skill.type = :type', { type });
    }

    const totalCount = await countQb.getCount();

    const edges: SkillEdge[] = pageItems.map((item) => ({
      node: item,
      cursor: Buffer.from(item.createdAt.toISOString()).toString('base64'),
    }));

    const endCursor =
      edges.length > 0 ? edges[edges.length - 1].cursor : undefined;

    return {
      edges,
      pageInfo: { hasNextPage, endCursor },
      totalCount,
    };
  }

  async addPortfolio(
    userId: string,
    input: AddPortfolioInput,
  ): Promise<Portfolio> {
    await this.assertNotGuest(userId);
    const skill = await this.skillRepository.findOne({
      where: { id: input.skillId, userId },
    });
    if (!skill) throw new NotFoundException('Skill not found or unauthorized');

    const portfolio = this.portfolioRepository.create(input);
    return this.portfolioRepository.save(portfolio);
  }

  async removePortfolio(userId: string, id: string): Promise<boolean> {
    await this.assertNotGuest(userId);
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['skill'],
    });

    if (!portfolio || portfolio.skill.userId !== userId) {
      throw new NotFoundException('Portfolio item not found or unauthorized');
    }

    await this.portfolioRepository.remove(portfolio);
    return true;
  }

  async updatePortfolio(
    userId: string,
    id: string,
    input: UpdatePortfolioInput,
  ): Promise<Portfolio> {
    await this.assertNotGuest(userId);
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: ['skill'],
    });

    if (!portfolio || portfolio.skill.userId !== userId) {
      throw new NotFoundException('Portfolio item not found or unauthorized');
    }

    Object.assign(portfolio, input);
    return this.portfolioRepository.save(portfolio);
  }

  async findManyByIds(ids: readonly string[]): Promise<Skill[]> {
    return this.skillRepository.find({ where: { id: In(ids as string[]) } });
  }
}
