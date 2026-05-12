import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/user.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      clientID: configService.get<string>('app.googleClientId') || 'client',
      clientSecret:
        configService.get<string>('app.googleClientSecret') || 'secret',
      callbackURL: configService.get<string>('app.googleCallbackUrl') || 'cb',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails: Array<{ value: string }>;
      displayName: string;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0].value;
    const avatar = photos?.[0]?.value;

    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      user = this.userRepository.create({
        googleId: id,
        email,
        name: displayName,
        avatar,
        isVerified: true,
      });
      await this.userRepository.save(user);
    } else if (!user.googleId) {
      user.googleId = id;
      if (!user.avatar) user.avatar = avatar;
      await this.userRepository.save(user);
    }

    done(null, user);
  }
}
