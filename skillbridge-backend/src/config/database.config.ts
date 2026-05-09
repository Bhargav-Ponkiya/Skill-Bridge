import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => {
    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5433/skillbridge';
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
      extra:
        process.env.NODE_ENV === 'production'
          ? {
              max: 10,
              connectionTimeoutMillis: 5000,
            }
          : {},
    };
  },
);
