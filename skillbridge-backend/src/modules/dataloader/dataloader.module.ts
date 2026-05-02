import { Module, forwardRef } from '@nestjs/common';
import { DataloaderService } from './dataloader.service';
import { UserModule } from '../user/user.module';
import { SkillModule } from '../skill/skill.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => SkillModule)],
  providers: [DataloaderService],
  exports: [DataloaderService],
})
export class DataloaderModule {}
