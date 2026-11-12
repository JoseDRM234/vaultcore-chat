import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RoleEnum } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    const qb = this.userRepository.createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email });

    if (withPassword) {
      qb.addSelect('user.passwordHash');
    }

    return qb.getOne();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async findAll(search?: string): Promise<User[]> {
    if (search) {
      return this.userRepository.find({
        where: [
          { email: ILike(`%${search}%`) },
          { fullName: ILike(`%${search}%`) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.userRepository.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario registrado con este correo electrónico');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      email: dto.email.trim().toLowerCase(),
      fullName: dto.fullName,
      passwordHash,
      role: dto.role || RoleEnum.MEMBER,
      firstAccess: true,
    });

    const saved = await this.userRepository.save(user);
    const { passwordHash: _, ...result } = saved;
    return result as User;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async setPublicKey(userId: string, publicKey: string): Promise<User> {
    const user = await this.findById(userId);
    user.publicKey = publicKey;
    user.firstAccess = false;
    return this.userRepository.save(user);
  }

  async getPublicKey(userId: string): Promise<{ userId: string; publicKey: string | null }> {
    const user = await this.findById(userId);
    return {
      userId: user.id,
      publicKey: user.publicKey,
    };
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }
}
