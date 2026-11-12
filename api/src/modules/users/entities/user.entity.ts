import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEnum } from '../../../common/enums/role.enum';
import { StatusEnum } from '../../../common/enums/status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: RoleEnum.MEMBER,
  })
  role: RoleEnum;

  @Column({
    type: 'varchar',
    length: 50,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @Column({ name: 'public_key', type: 'text', nullable: true })
  publicKey: string | null;

  @Column({ name: 'first_access', type: 'boolean', default: true })
  firstAccess: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
