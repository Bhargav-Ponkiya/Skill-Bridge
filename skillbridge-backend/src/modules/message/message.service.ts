import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Message } from './message.entity';
import { CreateMessageInput } from './dto/create-message.input';
import { User } from '../user/user.entity';
import { Session } from '../session/session.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createMessage(
    senderId: string,
    input: CreateMessageInput,
  ): Promise<Message> {
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      select: ['isGuest'],
    });
    if (sender?.isGuest) {
      throw new BadRequestException(
        'Guest accounts cannot send messages. Please register first.',
      );
    }
    const session = await this.sessionRepository.findOne({
      where: { id: input.sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      session.participant1Id !== senderId &&
      session.participant2Id !== senderId
    ) {
      throw new ForbiddenException('You are not a participant of this session');
    }
    const message = this.messageRepository.create({
      ...input,
      senderId,
    });
    return this.messageRepository.save(message);
  }

  private async assertSessionParticipant(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: ['id', 'participant1Id', 'participant2Id'],
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      session.participant1Id !== userId &&
      session.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant of this session');
    }
  }

  async getMessagesBySession(
    sessionId: string,
    userId?: string,
    limit?: number,
    offset?: number,
  ): Promise<Message[]> {
    if (userId) {
      await this.assertSessionParticipant(sessionId, userId);
    }
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      relations: ['sender'],
      ...(limit ? { take: limit } : {}),
      ...(offset ? { skip: offset } : {}),
    });
  }

  async markAsRead(messageId: string): Promise<Message | null> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });
    if (message) {
      message.isRead = true;
      return this.messageRepository.save(message);
    }
    return null;
  }

  /**
   * Bulk-mark every message in a session that wasn't sent by `viewerId` as read. Called
   * when the viewer opens the chat or sees new messages arrive while they're already there.
   */
  async markSessionRead(sessionId: string, viewerId: string): Promise<number> {
    await this.assertSessionParticipant(sessionId, viewerId);
    const result = await this.messageRepository.update(
      { sessionId, senderId: Not(viewerId), isRead: false },
      { isRead: true },
    );
    return result.affected ?? 0;
  }

  async unreadCountForSession(
    sessionId: string,
    viewerId: string,
  ): Promise<number> {
    await this.assertSessionParticipant(sessionId, viewerId);
    return this.messageRepository.count({
      where: { sessionId, senderId: Not(viewerId), isRead: false },
    });
  }
}
