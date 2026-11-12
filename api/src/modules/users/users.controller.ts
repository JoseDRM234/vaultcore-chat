import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetPublicKeyDto } from './dto/set-public-key.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Post('me/public-key')
  async setPublicKey(
    @CurrentUser('id') userId: string,
    @Body() dto: SetPublicKeyDto,
  ) {
    return this.usersService.setPublicKey(userId, dto.publicKey);
  }

  @Get()
  @Roles(RoleEnum.ADMIN, RoleEnum.MEMBER)
  async findAll(@Query('search') search?: string) {
    return this.usersService.findAll(search);
  }

  @Get(':id/public-key')
  @Roles(RoleEnum.ADMIN, RoleEnum.MEMBER)
  async getPublicKey(@Param('id') id: string) {
    return this.usersService.getPublicKey(id);
  }

  @Post()
  @Roles(RoleEnum.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
