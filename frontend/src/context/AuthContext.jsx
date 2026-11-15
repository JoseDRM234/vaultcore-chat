import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '@/services/auth-service'
import { apiClient } from '@/services/api-client'
import {
  generateUserKeyPair,
  storePrivateKeyLocally,
  loadPrivateKeyLocally,
} from '@/lib/crypto'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => apiClient.getToken())
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('vaultcore_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [privateKey, setPrivateKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initializingE2EE, setInitializingE2EE] = useState(false)

  // Sincronizar token en apiClient y sessionStorage
  const updateSession = useCallback((newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    if (newToken) {
      apiClient.setToken(newToken)
      sessionStorage.setItem('vaultcore_user', JSON.stringify(newUser))
    } else {
      apiClient.setToken(null)
      sessionStorage.removeItem('vaultcore_user')
    }
  }, [])

  const logout = useCallback(() => {
    updateSession(null, null)
    setPrivateKey(null)
    setInitializingE2EE(false)
  }, [updateSession])

  // Escuchar eventos de sesión expirada
  useEffect(() => {
    const handleUnauthorized = () => {
      logout()
    }
    window.addEventListener('vaultcore:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('vaultcore:unauthorized', handleUnauthorized)
  }, [logout])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      const loggedUser = data.user
      const accessToken = data.accessToken

      // Gestión Criptográfica E2EE
      if (loggedUser.firstAccess || !loggedUser.publicKey) {
        setInitializingE2EE(true)
        try {
          // 1. Generar par de claves RSA-OAEP
          const { publicKey, privateKey: generatedPrivKey } = await generateUserKeyPair()

          // 2. Cifrar con password y almacenar clave privada en IndexedDB
          await storePrivateKeyLocally(generatedPrivKey, password, loggedUser.id)

          // 3. Subir clave pública al backend
          await authService.uploadPublicKey(publicKey)

          loggedUser.firstAccess = false
          loggedUser.publicKey = publicKey
          setPrivateKey(generatedPrivKey)
        } finally {
          setInitializingE2EE(false)
        }
      } else {
        // Usuario recurrente: descifrar clave privada desde IndexedDB
        try {
          const loadedPrivKey = await loadPrivateKeyLocally(password, loggedUser.id)
          setPrivateKey(loadedPrivKey)
        } catch (cryptoErr) {
          console.warn('No se pudo cargar la clave privada local en este navegador:', cryptoErr.message)
          // Si no existe la clave local en este dispositivo pero es admin/auditor o desea regenerarla:
          // Generamos una nueva clave para permitir continuar
          if (!loggedUser.publicKey) {
            const { publicKey, privateKey: generatedPrivKey } = await generateUserKeyPair()
            await storePrivateKeyLocally(generatedPrivKey, password, loggedUser.id)
            await authService.uploadPublicKey(publicKey)
            loggedUser.publicKey = publicKey
            setPrivateKey(generatedPrivKey)
          }
        }
      }

      updateSession(accessToken, loggedUser)
      return loggedUser
    } finally {
      setLoading(false)
    }
  }

  const value = {
    token,
    user,
    privateKey,
    setPrivateKey,
    loading,
    initializingE2EE,
    login,
    logout,
    isAuthenticated: Boolean(token && user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}
