import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './skill.entity';
import { Portfolio } from './portfolio.entity';
import { SkillService } from './skill.service';
import { SkillResolver } from './skill.resolver';
import { DataloaderModule } from '../dataloader/dataloader.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Skill, Portfolio]),
    DataloaderModule,
    AiModule,
  ],
  providers: [SkillService, SkillResolver],
  exports: [SkillService],
})
export class SkillModule {}
