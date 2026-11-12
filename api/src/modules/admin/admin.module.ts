import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ChannelsModule } from '../channels/channels.module';
import { AuditModule } from '../audit/audit.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [UsersModule, ChannelsModule, AuditModule, MessagesModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
