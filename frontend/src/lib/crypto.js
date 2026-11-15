import { openDB } from 'idb'

const DB_NAME = 'vaultcore_crypto_db'
const DB_VERSION = 1
const STORE_NAME = 'keys'

const getCrypto = () => (typeof window !== 'undefined' ? window.crypto : globalThis.crypto)
const b64encode = (str) => (typeof window !== 'undefined' ? window.btoa(str) : globalThis.btoa(str))
const b64decode = (str) => (typeof window !== 'undefined' ? window.atob(str) : globalThis.atob(str))

/**
 * Abre o inicializa la base de datos IndexedDB para custodia local de claves
 */
async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

/**
 * Convierte un ArrayBuffer / Uint8Array a cadena Base64
 */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return b64encode(binary)
}

/**
 * Convierte una cadena Base64 a ArrayBuffer
 */
export function base64ToBuffer(base64) {
  const binary = b64decode(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convierte una cadena Base64 a Uint8Array
 */
export function base64ToUint8Array(base64) {
  return new Uint8Array(base64ToBuffer(base64))
}

/**
 * 1. Genera par de claves RSA-OAEP (2048 bits, SHA-256)
 * Exporta la clave pública en formato SPKI/Base64 para la API
 */
export async function generateUserKeyPair() {
  const crypto = getCrypto()
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  )

  const spkiBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKey = bufferToBase64(spkiBuffer)

  return {
    publicKey,
    publicKeyBase64: publicKey,
    privateKey: keyPair.privateKey,
  }
}

/**
 * 2. Deriva una clave AES-GCM (256 bits) desde la contraseña usando PBKDF2 (100,000 iteraciones)
 */
export async function deriveKeyFromPassword(password, salt) {
  const crypto = getCrypto()
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const saltBytes = typeof salt === 'string' ? base64ToUint8Array(salt) : salt

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 3. Exporta la clave privada RSA a PKCS8, la cifra con AES-GCM (derivada de password)
 * y la guarda en IndexedDB.
 */
export async function storePrivateKeyLocally(privateKey, password, userId = 'default') {
  const crypto = getCrypto()
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const derivedKey = await deriveKeyFromPassword(password, salt)
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    pkcs8
  )

  const payload = {
    encryptedKey: bufferToBase64(encryptedKey),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    updatedAt: new Date().toISOString(),
  }

  const db = await getDb()
  await db.put(STORE_NAME, payload, `private_key_${userId}`)
  await db.put(STORE_NAME, payload, 'active_user_private_key')
  return true
}

/**
 * 4. Recupera el blob cifrado desde IndexedDB, deriva la clave y descifra la clave privada en memoria
 */
export async function loadPrivateKeyLocally(password, userId = 'default') {
  const crypto = getCrypto()
  const db = await getDb()
  let record = await db.get(STORE_NAME, `private_key_${userId}`)
  if (!record && userId !== 'default') {
    record = await db.get(STORE_NAME, 'active_user_private_key')
  }

  if (!record) {
    throw new Error('No se encontró clave privada almacenada localmente en este navegador.')
  }

  const salt = base64ToUint8Array(record.salt)
  const iv = base64ToUint8Array(record.iv)
  const encryptedBuffer = base64ToBuffer(record.encryptedKey)

  const derivedKey = await deriveKeyFromPassword(password, salt)

  let decryptedPkcs8
  try {
    decryptedPkcs8 = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encryptedBuffer
    )
  } catch (err) {
    throw new Error('Contraseña incorrecta o clave local corrupta al descifrar identidad.', { cause: err })
  }

  return crypto.subtle.importKey(
    'pkcs8',
    decryptedPkcs8,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  )
}

/**
 * 5. Genera clave simétrica AES-GCM de 256 bits para el grupo/canal
 */
export async function generateChannelKey() {
  const crypto = getCrypto()
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * 6. Cifra la clave simétrica del canal con la clave pública RSA-OAEP de un miembro
 * Retorna la clave cifrada en formato Base64
 */
export async function encryptChannelKeyForMember(channelKey, memberPublicKeySpkiBase64) {
  const crypto = getCrypto()
  const spkiBuffer = base64ToBuffer(memberPublicKeySpkiBase64)
  const publicKey = await crypto.subtle.importKey(
    'spki',
    spkiBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )

  const rawChannelKey = await crypto.subtle.exportKey('raw', channelKey)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawChannelKey
  )

  return bufferToBase64(encrypted)
}

/**
 * 7. Descifra la clave simétrica del canal con la clave privada RSA-OAEP del usuario
 */
export async function decryptChannelKey(encryptedChannelKeyBase64, myPrivateKey) {
  const crypto = getCrypto()
  const encryptedBuffer = base64ToBuffer(encryptedChannelKeyBase64)
  const rawKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    myPrivateKey,
    encryptedBuffer
  )

  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * 8. Cifra un mensaje de texto plano con la clave simétrica AES-GCM del canal
 * Retorna { ciphertext: base64, iv: base64 }
 */
export async function encryptMessage(channelKey, plainText) {
  const crypto = getCrypto()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const data = enc.encode(plainText)

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    channelKey,
    data
  )

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  }
}

/**
 * 9. Descifra un mensaje cifrado con AES-GCM
 */
export async function decryptMessage(channelKey, ciphertextBase64, ivBase64) {
  const crypto = getCrypto()
  const ciphertextBuffer = base64ToBuffer(ciphertextBase64)
  const iv = base64ToUint8Array(ivBase64)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    channelKey,
    ciphertextBuffer
  )

  const dec = new TextDecoder()
  return dec.decode(decryptedBuffer)
}
