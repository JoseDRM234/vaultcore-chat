import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20261112113000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extensión para UUIDs
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 1. Tabla de Usuarios
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "full_name" VARCHAR(255) NOT NULL,
        "role" VARCHAR(50) NOT NULL DEFAULT 'member',
        "status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "public_key" TEXT NULL,
        "first_access" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Tabla de Workspaces
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspaces" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(100) UNIQUE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Tabla de Canales / Grupos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "channels" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL,
        "type" VARCHAR(50) NOT NULL DEFAULT 'group',
        "policy" VARCHAR(50) NOT NULL DEFAULT 'standard',
        "created_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Tabla de Miembros del Canal (Distribuidores de clave de canal cifrada E2EE)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "channel_members" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "channel_id" UUID NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" VARCHAR(50) NOT NULL DEFAULT 'member',
        "encrypted_channel_key" TEXT NULL,
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_channel_user" UNIQUE ("channel_id", "user_id")
      );
    `);

    // 5. Tabla de Mensajes (Almacenamiento de Ciphertext / Cartero Ciego)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "channel_id" UUID NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "sender_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ciphertext" TEXT NOT NULL,
        "iv" VARCHAR(64) NOT NULL,
        "signature" TEXT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Tabla de Registro Inmutable de Auditoría
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_events" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "actor_id" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "actor_email" VARCHAR(255) NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "target_resource" VARCHAR(255) NULL,
        "detail" TEXT NULL,
        "ip_address" VARCHAR(45) NULL,
        "user_agent" VARCHAR(500) NULL
      );
    `);

    // Índices para optimización de consultas
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_channel_members_user" ON "channel_members"("user_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_channel_members_channel" ON "channel_members"("channel_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_messages_channel_created" ON "messages"("channel_id", "created_at" DESC);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_events_timestamp" ON "audit_events"("timestamp" DESC);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channel_members";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channels";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspaces";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
