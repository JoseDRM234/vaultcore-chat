import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('channels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  async getMyChannels(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
  ) {
    return this.channelsService.findUserChannels(userId, type);
  }

  @Post()
  async createChannel(
    @CurrentUser() user: User,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(dto, user.id, user.email);
  }

  @Get(':id')
  async getChannel(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelsService.findById(channelId, userId);
  }

  @Get(':id/members')
  async getMembers(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelsService.getMembers(channelId, userId);
  }

  @Post(':id/members')
  async addMember(
    @CurrentUser() user: User,
    @Param('id') channelId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.channelsService.addMember(channelId, dto, user.id, user.email);
  }
}
