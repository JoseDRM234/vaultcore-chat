import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleEnum } from '../../../common/enums/role.enum';
import { StatusEnum } from '../../../common/enums/status.enum';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEnum(RoleEnum)
  @IsOptional()
  role?: RoleEnum;

  @IsEnum(StatusEnum)
  @IsOptional()
  status?: StatusEnum;
}
