import { Controller, Get, Post, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  @Roles(RoleEnum.ADMIN, RoleEnum.AUDITOR)
  async getEvents(
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.auditService.findAll(Number(limit), Number(offset));
  }

  @Post('export')
  @Roles(RoleEnum.ADMIN, RoleEnum.AUDITOR)
  async exportCsv(@Res() res: Response) {
    const csvData = await this.auditService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vaultcore-audit-log.csv"');
    return res.send(csvData);
  }
}
