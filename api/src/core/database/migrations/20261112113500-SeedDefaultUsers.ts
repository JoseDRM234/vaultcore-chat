import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultUsers20261112113500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = '$2b$10$1kOKFNUCLhCCLt34IVGyme0vEU15CGPvtHDFhsX6./T52eIGvFeCO'; // password123

    // 1. Usuarios demo
    await queryRunner.query(`
      INSERT INTO "users" ("id", "email", "password_hash", "full_name", "role", "status", "first_access")
      VALUES 
        ('a0000000-0000-0000-0000-000000000001', 'admin@vaultcore.test', '${passwordHash}', 'Alex Morgan', 'admin', 'active', false),
        ('a0000000-0000-0000-0000-000000000002', 'member@vaultcore.test', '${passwordHash}', 'Jordan Miller', 'member', 'active', true),
        ('a0000000-0000-0000-0000-000000000003', 'auditor@vaultcore.test', '${passwordHash}', 'Riley Chen', 'auditor', 'active', false)
      ON CONFLICT ("email") DO NOTHING;
    `);

    // 2. Workspace inicial
    await queryRunner.query(`
      INSERT INTO "workspaces" ("id", "name", "slug")
      VALUES ('b0000000-0000-0000-0000-000000000001', 'Northstar Workspace', 'northstar')
      ON CONFLICT ("slug") DO NOTHING;
    `);

    // 3. Canales iniciales
    await queryRunner.query(`
      INSERT INTO "channels" ("id", "name", "type", "policy", "created_by")
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'General Workspace', 'group', 'standard', 'a0000000-0000-0000-0000-000000000001'),
        ('c0000000-0000-0000-0000-000000000002', 'Security Operations', 'group', 'restricted', 'a0000000-0000-0000-0000-000000000001')
      ON CONFLICT ("id") DO NOTHING;
    `);

    // 4. Membresías iniciales
    await queryRunner.query(`
      INSERT INTO "channel_members" ("channel_id", "user_id", "role")
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner'),
        ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'member'),
        ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'owner')
      ON CONFLICT ON CONSTRAINT "uq_channel_user" DO NOTHING;
    `);

    // 5. Evento inicial de auditoría
    await queryRunner.query(`
      INSERT INTO "audit_events" ("actor_id", "actor_email", "action", "target_resource", "detail")
      VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'system@vaultcore.io',
        'SYSTEM_INITIALIZED',
        'Workspace:Northstar',
        'Plataforma VaultCore Chat inicializada con cuentas base y políticas de seguridad.'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "audit_events" WHERE "actor_email" = 'system@vaultcore.io';`);
    await queryRunner.query(`DELETE FROM "channel_members" WHERE "channel_id" IN ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');`);
    await queryRunner.query(`DELETE FROM "channels" WHERE "id" IN ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002');`);
    await queryRunner.query(`DELETE FROM "workspaces" WHERE "id" = 'b0000000-0000-0000-0000-000000000001';`);
    await queryRunner.query(`DELETE FROM "users" WHERE "email" IN ('admin@vaultcore.test', 'member@vaultcore.test', 'auditor@vaultcore.test');`);
  }
}
