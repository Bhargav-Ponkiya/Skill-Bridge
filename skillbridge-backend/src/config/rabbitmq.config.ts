import { registerAs } from '@nestjs/config';

export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  exchanges: {
    skillbridge: 'skillbridge.exchange',
  },
  queues: {
    matchRequested: 'match.requested',
    notificationSend: 'notification.send',
    sessionReminder: 'session.reminder',
  },
}));
