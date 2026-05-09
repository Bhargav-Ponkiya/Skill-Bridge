import { Injectable, Scope, Inject, forwardRef } from '@nestjs/common';
import DataLoader from 'dataloader';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { Skill } from '../skill/skill.entity';
import { SkillService } from '../skill/skill.service';

@Injectable({ scope: Scope.REQUEST })
export class DataloaderService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => SkillService))
    private readonly skillService: SkillService,
  ) {}

  public readonly userLoader = new DataLoader<string, User | null>(
    async (userIds: readonly string[]) => {
      try {
        const users = await this.userService.findManyByIds(userIds);
        const map = new Map(users.map((u) => [u.id, u]));
        return userIds.map((id) => map.get(id) ?? null);
      } catch {
        return userIds.map(() => null);
      }
    },
  );

  public readonly skillLoader = new DataLoader<string, Skill | null>(
    async (skillIds: readonly string[]) => {
      try {
        const skills = await this.skillService.findManyByIds(skillIds);
        const map = new Map(skills.map((s) => [s.id, s]));
        return skillIds.map((id) => map.get(id) ?? null);
      } catch {
        return skillIds.map(() => null);
      }
    },
  );
}
