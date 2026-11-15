import { apiClient } from './api-client'

export const authService = {
  /**
   * Inicia sesión con email y contraseña contra la API
   * POST /api/v1/auth/login
   */
  async login(email, password) {
    const data = await apiClient.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    })

    if (data.accessToken) {
      apiClient.setToken(data.accessToken)
      sessionStorage.setItem('vaultcore_user', JSON.stringify(data.user))
    }

    return data
  },

  /**
   * Sube la clave pública SPKI en Base64 generada localmente
   * POST /api/v1/users/me/public-key
   */
  async uploadPublicKey(publicKey) {
    return apiClient.post('/users/me/public-key', { publicKey })
  },

  /**
   * Obtiene los datos del usuario en sesión
   * GET /api/v1/users/me
   */
  async getMe() {
    return apiClient.get('/users/me')
  },

  /**
   * Credenciales demo precargadas para acceso rápido
   */
  demoCredentials(role) {
    const credentials = {
      admin: { email: 'admin@vaultcore.test', password: 'password123' },
      member: { email: 'member@vaultcore.test', password: 'password123' },
      auditor: { email: 'auditor@vaultcore.test', password: 'password123' },
    }
    return credentials[role] || credentials.member
  },
}
