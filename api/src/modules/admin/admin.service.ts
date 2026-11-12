import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ChannelsService } from '../channels/channels.service';
import { AuditService } from '../audit/audit.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly channelsService: ChannelsService,
    private readonly auditService: AuditService,
    private readonly messagesService: MessagesService,
  ) {}

  async getStats() {
    const [usersCount, channelsCount, auditEventsCount, messagesCount] = await Promise.all([
      this.usersService.count(),
      this.channelsService.count(),
      this.auditService.count(),
      this.messagesService.count(),
    ]);

    return {
      activeUsers: usersCount,
      encryptedGroups: channelsCount,
      auditEvents: auditEventsCount,
      totalMessages: messagesCount,
      systemStatus: 'operational',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
