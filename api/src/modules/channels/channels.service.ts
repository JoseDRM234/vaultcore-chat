import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private readonly memberRepository: Repository<ChannelMember>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateChannelDto, creatorId: string, actorEmail: string): Promise<Channel> {
    const channel = this.channelRepository.create({
      name: dto.name,
      type: dto.type || 'group',
      policy: dto.policy || 'standard',
      createdBy: creatorId,
    });

    const savedChannel = await this.channelRepository.save(channel);

    // Agregar al creador como owner del canal
    const membersToSave: Partial<ChannelMember>[] = [
      {
        channelId: savedChannel.id,
        userId: creatorId,
        role: 'owner',
      },
    ];

    // Asignar miembros iniciales con sus respectivas claves cifradas
    if (dto.members && dto.members.length > 0) {
      for (const m of dto.members) {
        if (m.userId !== creatorId) {
          membersToSave.push({
            channelId: savedChannel.id,
            userId: m.userId,
            role: m.role || 'member',
            encryptedChannelKey: m.encryptedChannelKey || null,
          });
        } else {
          // Si el creador pasó su propia encryptedChannelKey
          membersToSave[0].encryptedChannelKey = m.encryptedChannelKey || null;
        }
      }
    }

    await this.memberRepository.save(membersToSave as ChannelMember[]);

    await this.auditService.logEvent({
      actorId: creatorId,
      actorEmail,
      action: 'GROUP_CREATED',
      targetResource: `Channel:${savedChannel.name}`,
      detail: `Canal creado con ${membersToSave.length} miembro(s)`,
    });

    return this.findById(savedChannel.id, creatorId);
  }

  async findUserChannels(userId: string, type?: string): Promise<any[]> {
    const qb = this.channelRepository.createQueryBuilder('channel')
      .innerJoinAndSelect('channel.members', 'member')
      .where('member.userId = :userId', { userId });

    if (type) {
      qb.andWhere('channel.type = :type', { type });
    }

    qb.orderBy('channel.createdAt', 'DESC');

    const channels = await qb.getMany();

    // Mapear con la clave de canal específica del usuario
    return channels.map((c) => {
      const userMembership = c.members.find((m) => m.userId === userId);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        policy: c.policy,
        createdAt: c.createdAt,
        role: userMembership?.role,
        encryptedChannelKey: userMembership?.encryptedChannelKey,
      };
    });
  }

  async findById(channelId: string, userId?: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
      relations: {
        members: {
          user: true,
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Canal ${channelId} no encontrado`);
    }

    if (userId) {
      const isMember = channel.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('No tienes acceso a este canal');
      }
    }

    return channel;
  }

  async addMember(
    channelId: string,
    dto: AddMemberDto,
    actorId: string,
    actorEmail: string,
  ): Promise<ChannelMember> {
    const channel = await this.findById(channelId, actorId);

    const existing = await this.memberRepository.findOne({
      where: { channelId, userId: dto.userId },
    });

    if (existing) {
      throw new ConflictException('El usuario ya es miembro de este canal');
    }

    const member = this.memberRepository.create({
      channelId,
      userId: dto.userId,
      role: dto.role || 'member',
      encryptedChannelKey: dto.encryptedChannelKey || null,
    });

    const saved = await this.memberRepository.save(member);

    await this.auditService.logEvent({
      actorId,
      actorEmail,
      action: 'MEMBER_ADDED',
      targetResource: `Channel:${channel.name}`,
      detail: `Usuario ${dto.userId} añadido al canal`,
    });

    return saved;
  }

  async getMembers(channelId: string, userId: string): Promise<ChannelMember[]> {
    await this.findById(channelId, userId);
    return this.memberRepository.find({
      where: { channelId },
      relations: {
        user: true,
      },
    });
  }

  async count(): Promise<number> {
    return this.channelRepository.count();
  }
}
