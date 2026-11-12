#!/usr/bin/env node

/**
 * VaultCore Chat - Script Automatizado de Pruebas de Integración y E2EE
 * 
 * Ejecuta una suite completa de pruebas funcionales contra la API NestJS:
 * - Autenticación y JWT (Login con roles Admin, Member, Auditor)
 * - Control de Acceso Basado en Roles (RBAC 403 / 200)
 * - Gestión de Identidad y Registro de Claves Públicas (E2EE)
 * - Creación de Canales y Distribución de Claves de Grupo Cifradas
 * - Persistencia y Consulta de Mensajes Cifrados (Cartero Ciego)
 * - Trazabilidad Inmutable de Auditoría y Exportación CSV
 * - Comunicación en Tiempo Real mediante WebSockets (Socket.IO)
 */

import { spawn } from 'child_process';
import { io } from 'socket.io-client';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const WS_BASE = process.env.WS_BASE_URL || 'http://localhost:4000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

let serverProcess = null;
let spawnedServer = false;
let passedCount = 0;
let failedCount = 0;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function isServerRunning() {
  try {
    const res = await fetch(`${API_BASE}/audit/events`, { signal: AbortSignal.timeout(1000) });
    return res.status === 401 || res.status === 200;
  } catch {
    return false;
  }
}

async function startServerIfNeeded() {
  const running = await isServerRunning();
  if (running) {
    console.log(`${colors.cyan}ℹ Servidor detectado en ejecución en ${API_BASE}${colors.reset}\n`);
    return;
  }

  console.log(`${colors.yellow}⏳ Servidor no detectado. Iniciando instancia temporal de NestJS...${colors.reset}`);
  serverProcess = spawn('node', ['dist/main.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  spawnedServer = true;

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    if (await isServerRunning()) {
      console.log(`${colors.green}✔ Servidor iniciado exitosamente en ${API_BASE}${colors.reset}\n`);
      return;
    }
  }

  throw new Error('No se pudo iniciar el servidor de prueba tras 15 segundos.');
}

function stopServerIfSpawned() {
  if (spawnedServer && serverProcess) {
    console.log(`\n${colors.dim}Deteniendo servidor temporal...${colors.reset}`);
    serverProcess.kill('SIGTERM');
  }
}

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`  ${colors.green}✔${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
    passedCount++;
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`  ${colors.red}✖${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
    console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
    failedCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Aserción fallida');
  }
}

// ==========================================
// Suite Principal de Pruebas
// ==========================================
async function main() {
  console.log(`${colors.bright}${colors.cyan}=====================================================${colors.reset}`);
  console.log(`${colors.bright} 🛡️  VaultCore Chat — Test Suite de API y Seguridad E2EE${colors.reset}`);
  console.log(`${colors.cyan}=====================================================${colors.reset}\n`);

  try {
    await startServerIfNeeded();
  } catch (err) {
    console.error(`${colors.red}Fallo al inicializar servidor: ${err.message}${colors.reset}`);
    process.exit(1);
  }

  let adminToken = null;
  let memberToken = null;
  let auditorToken = null;
  let memberUser = null;
  let channelId = null;
  const dummyPublicKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxVaultCoreTestPublicKeySampleJWK2026';

  // 1. AUTENTICACIÓN
  console.log(`${colors.bright}[1. Módulo de Autenticación y JWT]${colors.reset}`);

  await runTest('Rechazo de credenciales inválidas (401 Unauthorized)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@vaultcore.test', password: 'wrongpassword' },
    });
    assert(res.status === 401, `Se esperaba status 401 pero se obtuvo ${res.status}`);
  });

  await runTest('Inicio de sesión como Administrador (admin@vaultcore.test)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@vaultcore.test', password: 'password123' },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(res.data?.accessToken, 'Debe devolver un accessToken');
    assert(res.data?.user?.role === 'admin', 'El rol debe ser admin');
    adminToken = res.data.accessToken;
  });

  await runTest('Inicio de sesión como Miembro (member@vaultcore.test)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'member@vaultcore.test', password: 'password123' },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(res.data?.user?.role === 'member', 'El rol debe ser member');
    memberToken = res.data.accessToken;
    memberUser = res.data.user;
  });

  await runTest('Inicio de sesión como Auditor (auditor@vaultcore.test)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'auditor@vaultcore.test', password: 'password123' },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(res.data?.user?.role === 'auditor', 'El rol debe ser auditor');
    auditorToken = res.data.accessToken;
  });

  // 2. CONTROL DE ACCESO (RBAC)
  console.log(`\n${colors.bright}[2. Control de Acceso Basado en Roles (RBAC)]${colors.reset}`);

  await runTest('Miembro intentando acceder a métricas de administración (Debe dar 403 Forbidden)', async () => {
    const res = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(res.status === 403, `Se esperaba 403 Forbidden pero se obtuvo ${res.status}`);
  });

  await runTest('Administrador accediendo a métricas del sistema (/admin/stats)', async () => {
    const res = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Se esperaba 200 OK pero se obtuvo ${res.status}`);
    assert(typeof res.data?.activeUsers === 'number', 'activeUsers debe ser numérico');
    assert(typeof res.data?.encryptedGroups === 'number', 'encryptedGroups debe ser numérico');
  });

  // 3. GESTIÓN DE IDENTIDAD Y CLAVES CRIPTOGRÁFICAS
  console.log(`\n${colors.bright}[3. Identidad y Custodia de Claves Públicas (E2EE)]${colors.reset}`);

  await runTest('Perfil de usuario autenticado (/users/me)', async () => {
    const res = await request('/users/me', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(res.data.email === 'member@vaultcore.test', 'Email debe coincidir con el usuario en sesión');
  });

  await runTest('Registro de Clave Pública del usuario en primer acceso (POST /users/me/public-key)', async () => {
    const res = await request('/users/me/public-key', {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: { publicKey: dummyPublicKey },
    });
    assert(res.status === 201 || res.status === 200, `Status esperado 200/201, obtenido ${res.status}`);
    assert(res.data.publicKey === dummyPublicKey, 'La clave pública devuelta debe coincidir con la enviada');
    assert(res.data.firstAccess === false, 'firstAccess debe actualizarse a false tras configurar la clave');
  });

  await runTest('Consulta de Clave Pública de otro usuario (GET /users/:id/public-key)', async () => {
    const res = await request(`/users/${memberUser.id}/public-key`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(res.data.publicKey === dummyPublicKey, 'Debe devolver la clave pública registrada por el miembro');
  });

  await runTest('Listado del directorio de usuarios (/users)', async () => {
    const res = await request('/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(Array.isArray(res.data) && res.data.length >= 3, 'Debe contener al menos los 3 usuarios base');
  });

  // 4. CANALES Y DISTRIBUCIÓN DE CLAVES DE GRUPO
  console.log(`\n${colors.bright}[4. Canales y Distribución de Claves de Grupo]${colors.reset}`);

  await runTest('Consulta de canales del usuario (/channels)', async () => {
    const res = await request('/channels', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(Array.isArray(res.data), 'Debe ser un array de canales');
    if (res.data.length > 0) {
      channelId = res.data[0].id;
    }
  });

  await runTest('Creación de un grupo nuevo con clave cifrada para los miembros', async () => {
    const groupName = `Security Taskforce ${Date.now().toString().slice(-4)}`;
    const res = await request('/channels', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: groupName,
        type: 'group',
        policy: 'restricted',
        members: [
          {
            userId: memberUser.id,
            role: 'member',
            encryptedChannelKey: 'AESKeyWrappedWithMemberPublicKeyRSA2048==',
          },
        ],
      },
    });
    assert(res.status === 201 || res.status === 200, `Status esperado 201, obtenido ${res.status}`);
    assert(res.data.name === groupName, 'El nombre del canal debe coincidir');
    channelId = res.data.id;
  });

  // 5. MENSAJERÍA CIFRADA (CARTERO CIEGO)
  console.log(`\n${colors.bright}[5. Mensajería Cifrada (Cartero Ciego / E2EE)]${colors.reset}`);

  const sampleCiphertext = 'z7mKQ8vL1pXy00wJqR+CiphertextPayloadSampleEncryptedByClient==';
  const sampleIV = '9xKpL028jUa1';

  await runTest('Envío de mensaje cifrado vía REST (POST /channels/:id/messages)', async () => {
    const res = await request(`/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: {
        ciphertext: sampleCiphertext,
        iv: sampleIV,
        signature: 'client-digital-signature-test',
      },
    });
    assert(res.status === 201 || res.status === 200, `Status esperado 201, obtenido ${res.status}`);
    assert(res.data.ciphertext === sampleCiphertext, 'El ciphertext no debe ser modificado por el servidor');
    assert(res.data.iv === sampleIV, 'El IV debe persistirse idéntico');
  });

  await runTest('Recuperación del historial de mensajes cifrados', async () => {
    const res = await request(`/channels/${channelId}/messages`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(Array.isArray(res.data), 'Debe devolver un arreglo de mensajes');
    const msg = res.data.find((m) => m.ciphertext === sampleCiphertext);
    assert(msg, 'El mensaje cifrado enviado previamente debe estar presente en la respuesta');
  });

  // 6. TRAZABILIDAD Y AUDITORÍA INMUTABLE
  console.log(`\n${colors.bright}[6. Trazabilidad Inmutable y Auditoría (Rol Auditor)]${colors.reset}`);

  await runTest('Consulta de eventos de auditoría (/audit/events)', async () => {
    const res = await request('/audit/events?limit=20', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(res.status === 200, `Status esperado 200, obtenido ${res.status}`);
    assert(Array.isArray(res.data?.data), 'Debe contener arreglo de eventos de auditoría');
    assert(res.data.total >= 3, 'Debe haber registrado los eventos previos de login y canal');
  });

  await runTest('Exportación de logs de auditoría en formato CSV (/audit/export)', async () => {
    const res = await request('/audit/export', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(res.status === 200 || res.status === 201, `Status esperado 200, obtenido ${res.status}`);
    assert(typeof res.data === 'string' && res.data.includes('ID,Timestamp,ActorEmail'), 'Debe contener encabezados CSV');
  });

  // 7. WEBSOCKET GATEWAY EN TIEMPO REAL
  console.log(`\n${colors.bright}[7. Tiempo Real mediante WebSocket (Socket.IO)]${colors.reset}`);

  await runTest('Conexión con JWT, suscripción a sala y retransmisión de mensaje cifrado', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(WS_BASE, {
        auth: { token: memberToken },
        transports: ['websocket'],
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Timeout de WebSocket: no se recibió el evento message:new a tiempo'));
      }, 5000);

      socket.on('connect', () => {
        // 1. Escuchar evento retransmitido
        socket.on('message:new', (incomingMsg) => {
          if (incomingMsg.ciphertext === 'WS-Encrypted-Payload-12345==') {
            clearTimeout(timeout);
            socket.disconnect();
            resolve();
          }
        });

        // 2. Unirse a la sala del canal
        socket.emit('channel:join', { channelId });

        // 3. Emitir mensaje cifrado tras suscripción
        setTimeout(() => {
          socket.emit('message:send', {
            channelId,
            ciphertext: 'WS-Encrypted-Payload-12345==',
            iv: 'wsIV12345678',
          });
        }, 150);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Error de conexión WebSocket: ${err.message}`));
      });
    });
  });

  // ==========================================
  // Resumen Final
  // ==========================================
  console.log(`\n${colors.cyan}=====================================================${colors.reset}`);
  console.log(`${colors.bright} 📊 Resumen de Resultados de la Suite${colors.reset}`);
  console.log(`${colors.cyan}=====================================================${colors.reset}`);
  console.log(`  ${colors.green}Pruebas Aprobadas:${colors.reset} ${passedCount}`);
  console.log(`  ${colors.red}Pruebas Fallidas:${colors.reset}  ${failedCount}`);

  stopServerIfSpawned();

  if (failedCount > 0) {
    console.log(`\n${colors.red}${colors.bright}❌ La suite terminó con fallos.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bright}🎉 Todas las pruebas de la API pasaron satisfactoriamente!${colors.reset}\n`);
    process.exit(0);
  }
}

// Limpieza ante interrupción manual
process.on('SIGINT', () => {
  stopServerIfSpawned();
  process.exit(1);
});
process.on('SIGTERM', () => {
  stopServerIfSpawned();
  process.exit(1);
});

main().catch((err) => {
  console.error(err);
  stopServerIfSpawned();
  process.exit(1);
});
