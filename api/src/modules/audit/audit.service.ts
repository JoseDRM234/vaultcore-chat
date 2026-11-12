import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
  ) {}

  async logEvent(dto: CreateAuditEventDto): Promise<AuditEvent> {
    const event = this.auditRepository.create(dto);
    return this.auditRepository.save(event);
  }

  async findAll(limit = 50, offset = 0): Promise<{ data: AuditEvent[]; total: number }> {
    const [data, total] = await this.auditRepository.findAndCount({
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }

  async count(): Promise<number> {
    return this.auditRepository.count();
  }

  async exportCsv(): Promise<string> {
    const events = await this.auditRepository.find({
      order: { timestamp: 'DESC' },
      take: 1000,
    });

    const headers = 'ID,Timestamp,ActorEmail,Action,TargetResource,Detail,IPAddress\n';
    const rows = events.map((e) =>
      `"${e.id}","${e.timestamp.toISOString()}","${e.actorEmail}","${e.action}","${e.targetResource || ''}","${(e.detail || '').replace(/"/g, '""')}","${e.ipAddress || ''}"`
    ).join('\n');

    return headers + rows;
  }
}
