import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuditEventDto {
  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsNotEmpty()
  actorEmail: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  targetResource?: string;

  @IsString()
  @IsOptional()
  detail?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}
