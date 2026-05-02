import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { SkillModule } from '../skill/skill.module';
import { Skill } from '../skill/skill.entity';
import { Portfolio } from '../skill/portfolio.entity';
import { Session } from '../session/session.entity';
import { Review } from '../review/review.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Skill, Portfolio, Session, Review]),
    forwardRef(() => SkillModule),
    AiModule,
  ],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
