import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth.response';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { Public } from '../../common/decorators/public.decorator';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Public()
  @Mutation(() => AuthResponse)
  async register(
    @Args('input') input: RegisterInput,
    @Context('res') res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, user } = await this.authService.register(input);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    return { accessToken, user };
  }

  @Public()
  @Mutation(() => AuthResponse)
  async login(
    @Args('input') input: LoginInput,
    @Context('res') res: Response,
  ): Promise<AuthResponse> {
    const { accessToken, user } = await this.authService.login(input);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    return { accessToken, user };
  }

  @Public()
  @Mutation(() => AuthResponse)
  async guestLogin(@Context('res') res: Response): Promise<AuthResponse> {
    const { accessToken, user } = await this.authService.guestLogin();
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    return { accessToken, user };
  }

  @Public()
  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('token') token: string,
    @Context('res') res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.refreshToken(token);
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    return result;
  }

  @Public()
  @Mutation(() => Boolean)
  logout(@Context('res') res: Response): boolean {
    if (res) {
      res.clearCookie('accessToken');
    }
    return true;
  }
}
