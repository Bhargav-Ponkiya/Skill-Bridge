import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Message } from './message.entity';
import { CreateMessageInput } from './dto/create-message.input';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async createMessage(senderId: string, input: CreateMessageInput): Promise<Message> {
    const message = this.messageRepository.create({
      ...input,
      senderId,
    });
    return this.messageRepository.save(message);
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      relations: ['sender'],
    });
  }

  async markAsRead(messageId: string): Promise<Message | null> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
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
    const result = await this.messageRepository.update(
      { sessionId, senderId: Not(viewerId), isRead: false },
      { isRead: true },
    );
    return result.affected ?? 0;
  }

  async unreadCountForSession(sessionId: string, viewerId: string): Promise<number> {
    return this.messageRepository.count({
      where: { sessionId, senderId: Not(viewerId), isRead: false },
    });
  }
}
