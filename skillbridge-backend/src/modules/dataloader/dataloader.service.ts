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

  public readonly userLoader = new DataLoader<string, User>(async (userIds: readonly string[]) => {
    return this.userService.findManyByIds(userIds);
  });

  public readonly skillLoader = new DataLoader<string, Skill>(async (skillIds: readonly string[]) => {
    return this.skillService.findManyByIds(skillIds);
  });
}
