import { apiClient } from './api-client'

export const usersService = {
  async list(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiClient.get(`/users${query}`)
  },

  async getById(id) {
    return apiClient.get(`/users/${id}`)
  },

  async getPublicKey(id) {
    return apiClient.get(`/users/${id}/public-key`)
  },

  async create(data) {
    return apiClient.post('/users', data)
  },

  async update(id, data) {
    return apiClient.patch(`/users/${id}`, data)
  },
}

export const channelsService = {
  async list(type = '') {
    const query = type ? `?type=${encodeURIComponent(type)}` : ''
    return apiClient.get(`/channels${query}`)
  },

  async getById(id) {
    return apiClient.get(`/channels/${id}`)
  },

  async getMembers(id) {
    return apiClient.get(`/channels/${id}/members`)
  },

  async create(data) {
    return apiClient.post('/channels', data)
  },

  async addMember(id, data) {
    return apiClient.post(`/channels/${id}/members`, data)
  },

  async getMessages(channelId, limit = 50, before = null) {
    let url = `/channels/${channelId}/messages?limit=${limit}`
    if (before) {
      url += `&before=${encodeURIComponent(before)}`
    }
    return apiClient.get(url)
  },

  async sendMessage(channelId, { ciphertext, iv, signature }) {
    return apiClient.post(`/channels/${channelId}/messages`, {
      ciphertext,
      iv,
      signature,
    })
  },
}

export const auditService = {
  async listEvents(limit = 50, offset = 0) {
    return apiClient.get(`/audit/events?limit=${limit}&offset=${offset}`)
  },

  async exportCsv() {
    const blob = await apiClient.post('/audit/export', {}, { responseType: 'blob' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vaultcore-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    return true
  },
}

export const adminService = {
  async getStats() {
    return apiClient.get('/admin/stats')
  },
}
