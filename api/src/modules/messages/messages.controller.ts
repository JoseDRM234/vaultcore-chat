import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('channels/:channelId/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async send(
    @Param('channelId') channelId: string,
    @CurrentUser('id') senderId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(channelId, senderId, dto);
  }

  @Get()
  async getMessages(
    @Param('channelId') channelId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit = 50,
    @Query('before') before?: string,
  ) {
    return this.messagesService.getChannelMessages(channelId, userId, Number(limit), before);
  }
}
