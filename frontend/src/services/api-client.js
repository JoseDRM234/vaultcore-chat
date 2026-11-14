const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:4000/api/v1'

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  getToken() {
    return sessionStorage.getItem('vaultcore_token')
  }

  setToken(token) {
    if (token) {
      sessionStorage.setItem('vaultcore_token', token)
    } else {
      sessionStorage.removeItem('vaultcore_token')
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    
    const headers = new Headers(options.headers || {})
    const token = this.getToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    const config = {
      ...options,
      headers,
    }

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body)
    }

    let response
    try {
      response = await fetch(url, config)
    } catch (networkError) {
      throw new Error(`Error de conexión con el servidor: ${networkError.message}`, { cause: networkError })
    }

    if (response.status === 401) {
      // Token expirado o inválido: limpiar sesión local
      this.setToken(null)
      sessionStorage.removeItem('vaultcore_user')
      window.dispatchEvent(new CustomEvent('vaultcore:unauthorized'))
    }

    // Si es descarga de archivo (como CSV de auditoría)
    if (options.responseType === 'blob') {
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      return response.blob()
    }

    // Si no hay contenido
    if (response.status === 204) {
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const errorMessage =
        (data && (typeof data === 'object' ? data.message || data.error : data)) ||
        `Error ${response.status}: ${response.statusText}`
      const err = new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage)
      err.status = response.status
      err.data = data
      throw err
    }

    return data
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body })
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body })
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
