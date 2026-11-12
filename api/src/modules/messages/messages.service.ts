import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChannelsService } from '../channels/channels.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly channelsService: ChannelsService,
  ) {}

  async sendMessage(
    channelId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    // Validar que el usuario pertenece al canal
    await this.channelsService.findById(channelId, senderId);

    const message = this.messageRepository.create({
      channelId,
      senderId,
      ciphertext: dto.ciphertext,
      iv: dto.iv,
      signature: dto.signature || null,
    });

    const saved = await this.messageRepository.save(message);

    return this.messageRepository.findOne({
      where: { id: saved.id },
      relations: {
        sender: true,
      },
    }) as Promise<Message>;
  }

  async getChannelMessages(
    channelId: string,
    userId: string,
    limit = 50,
    before?: string,
  ): Promise<Message[]> {
    // Validar membresía en el canal
    await this.channelsService.findById(channelId, userId);

    const where: any = { channelId };
    if (before) {
      where.createdAt = LessThan(new Date(before));
    }

    const messages = await this.messageRepository.find({
      where,
      relations: {
        sender: true,
      },
      order: { createdAt: 'ASC' },
      take: Math.min(limit, 100),
    });

    return messages;
  }

  async count(): Promise<number> {
    return this.messageRepository.count();
  }
}
