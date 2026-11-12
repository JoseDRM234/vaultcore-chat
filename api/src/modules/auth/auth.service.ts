import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(dto.email, true);

    if (!user) {
      await this.auditService.logEvent({
        actorEmail: dto.email,
        action: 'LOGIN_FAILED',
        detail: 'Intento de inicio de sesión con correo no registrado',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === 'suspended') {
      await this.auditService.logEvent({
        actorId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_BLOCKED',
        detail: 'Usuario suspendido intentó iniciar sesión',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('La cuenta de usuario se encuentra suspendida');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.auditService.logEvent({
        actorId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_FAILED',
        detail: 'Contraseña incorrecta',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    await this.auditService.logEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS',
      detail: `Inicio de sesión exitoso como rol ${user.role}`,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        firstAccess: user.firstAccess,
        publicKey: user.publicKey,
      },
    };
  }
}
