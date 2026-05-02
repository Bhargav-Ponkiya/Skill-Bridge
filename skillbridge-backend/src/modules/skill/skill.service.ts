import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, FindOptionsWhere, Not, ILike, In } from 'typeorm';
import { Skill, SkillType } from './skill.entity';
import { Portfolio } from './portfolio.entity';
import { CreateSkillInput } from './dto/create-skill.input';
import { UpdateSkillInput } from './dto/update-skill.input';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { PaginatedSkills } from './dto/paginated-skills.output';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SkillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
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
          skill.embedding = (await this.aiService.generateEmbedding(
            this.embeddableText(skill),
          )) as any;
          await this.skillRepository.save(skill);
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

  private embeddableText(skill: { title: string; description?: string | null; category?: string | null }): string {
    return [skill.title, skill.category, skill.description].filter(Boolean).join(' — ');
  }

  private async attachEmbedding(skill: Skill): Promise<void> {
    try {
      skill.embedding = (await this.aiService.generateEmbedding(
        this.embeddableText(skill),
      )) as any;
    } catch (err) {
      this.logger.warn(`Could not embed skill: ${(err as Error).message}`);
    }
  }

  async createSkill(userId: string, input: CreateSkillInput): Promise<Skill> {
    const skill = this.skillRepository.create({
      ...input,
      userId,
    });
    await this.attachEmbedding(skill);
    return this.skillRepository.save(skill);
  }

  async updateSkill(userId: string, id: string, input: UpdateSkillInput): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill not found or you do not have permission.');

    const titleChanged = input.title !== undefined && input.title !== skill.title;
    const descChanged = input.description !== undefined && input.description !== skill.description;
    const categoryChanged = input.category !== undefined && input.category !== skill.category;

    Object.assign(skill, input);

    // Re-embed only when the semantic content actually changed.
    if (titleChanged || descChanged || categoryChanged) {
      await this.attachEmbedding(skill);
    }

    return this.skillRepository.save(skill);
  }

  async toggleSkillActive(userId: string, id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill not found or you do not have permission.');

    skill.isActive = !skill.isActive;
    return this.skillRepository.save(skill);
  }

  async deleteSkill(userId: string, id: string): Promise<boolean> {
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill not found or you do not have permission.');

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
    pagination: PaginationInput = { page: 1, limit: 20 },
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
    } else {
      qb.andWhere('skill.type = :defaultType', { defaultType: SkillType.OFFER });
    }

    const [items, totalItems] = await qb
      .orderBy('skill.createdAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: pagination.limit,
        totalPages: Math.ceil(totalItems / pagination.limit),
        currentPage: pagination.page,
      },
    };
  }

  async addPortfolio(userId: string, input: any): Promise<Portfolio> {
    const skill = await this.skillRepository.findOne({ where: { id: input.skillId, userId } });
    if (!skill) throw new NotFoundException('Skill not found or unauthorized');

    const portfolio = this.portfolioRepository.create(input);
    return this.portfolioRepository.save(portfolio) as any;
  }

  async removePortfolio(userId: string, id: string): Promise<boolean> {
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

  async updatePortfolio(userId: string, id: string, input: any): Promise<Portfolio> {
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
