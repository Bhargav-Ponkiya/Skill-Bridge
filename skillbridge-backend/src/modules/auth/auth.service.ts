import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateTokens(user: User): { accessToken: string; refreshToken?: string } {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwtSecret')!,
      expiresIn: this.configService.get<string>('app.jwtAccessExpiry') as any,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwtRefreshSecret')!,
      expiresIn: this.configService.get<string>('app.jwtRefreshExpiry') as any,
    });
    return { accessToken, refreshToken };
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('app.jwtRefreshSecret')!,
      });
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('User not found');
      const { accessToken, refreshToken } = this.generateTokens(user);
      return { accessToken, refreshToken, user };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: input.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = this.userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    await this.userRepository.save(user);

    const { accessToken } = this.generateTokens(user);
    return { accessToken, user };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: input.email },
    });
    if (!user || (!user.passwordHash && user.googleId)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash!);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken } = this.generateTokens(user);
    return { accessToken, user };
  }

  async guestLogin(): Promise<AuthResponse> {
    const guestId = Math.random().toString(36).substring(7);
    const user = this.userRepository.create({
      email: `guest_${guestId}@skillbridge.io`,
      name: `Guest User ${guestId}`,
      isGuest: true,
      isVerified: false,
    });
    await this.userRepository.save(user);

    const { accessToken } = this.generateTokens(user);
    return { accessToken, user };
  }

  async me(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
