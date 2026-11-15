import { createContext, useContext, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  generateChannelKey,
  encryptChannelKeyForMember,
  decryptChannelKey,
  encryptMessage,
  decryptMessage,
} from '@/lib/crypto'

const CryptoContext = createContext(null)

export function CryptoProvider({ children }) {
  const { privateKey } = useAuth()
  // Caché en memoria: Map<channelId, CryptoKey>
  const channelKeysCache = useRef(new Map())

  const setChannelKey = useCallback((channelId, key) => {
    if (channelId && key) {
      channelKeysCache.current.set(channelId, key)
    }
  }, [])

  const getOrDecryptChannelKey = useCallback(
    async (channelId, encryptedChannelKeyBase64) => {
      if (!channelId) return null

      if (channelKeysCache.current.has(channelId)) {
        return channelKeysCache.current.get(channelId)
      }

      if (encryptedChannelKeyBase64 && privateKey) {
        try {
          const decryptedKey = await decryptChannelKey(
            encryptedChannelKeyBase64,
            privateKey
          )
          channelKeysCache.current.set(channelId, decryptedKey)
          return decryptedKey
        } catch (err) {
          console.error(`Error descifrando clave simétrica del canal ${channelId}:`, err)
          return null
        }
      }

      return null
    },
    [privateKey]
  )

  const encryptText = useCallback(
    async (channelId, plainText, encryptedChannelKeyBase64) => {
      const channelKey = await getOrDecryptChannelKey(channelId, encryptedChannelKeyBase64)
      if (!channelKey) {
        throw new Error('No se posee la clave criptográfica del canal para cifrar.')
      }
      return encryptMessage(channelKey, plainText)
    },
    [getOrDecryptChannelKey]
  )

  const decryptText = useCallback(
    async (channelId, ciphertext, iv, encryptedChannelKeyBase64) => {
      try {
        const channelKey = await getOrDecryptChannelKey(channelId, encryptedChannelKeyBase64)
        if (!channelKey) {
          return '[Mensaje cifrado · Clave de canal no disponible]'
        }
        return await decryptMessage(channelKey, ciphertext, iv)
      } catch {
        return '[Error al descifrar el mensaje]'
      }
    },
    [getOrDecryptChannelKey]
  )

  /**
   * Genera una clave simétrica para un nuevo canal y la cifra para cada miembro
   * @param {Array<{ userId: string, publicKey: string }>} membersWithPublicKeys
   * @param {string} creatorUserId
   */
  const createChannelKeysForMembers = useCallback(
    async (membersWithPublicKeys, creatorUserId) => {
      const channelKey = await generateChannelKey()
      const memberAssignments = []

      for (const member of membersWithPublicKeys) {
        if (member.publicKey) {
          try {
            const encryptedKey = await encryptChannelKeyForMember(
              channelKey,
              member.publicKey
            )
            memberAssignments.push({
              userId: member.userId,
              role: member.userId === creatorUserId ? 'owner' : 'member',
              encryptedChannelKey: encryptedKey,
            })
          } catch (err) {
            console.error(`Error cifrando clave para usuario ${member.userId}:`, err)
          }
        }
      }

      return {
        channelKey,
        memberAssignments,
      }
    },
    []
  )

  const value = {
    setChannelKey,
    getOrDecryptChannelKey,
    encryptText,
    decryptText,
    createChannelKeysForMembers,
  }

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>
}

export function useCrypto() {
  const context = useContext(CryptoContext)
  if (!context) {
    throw new Error('useCrypto debe ser usado dentro de un CryptoProvider')
  }
  return context
}
