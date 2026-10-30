export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
  'http://localhost:4000'

// TODO: Replace mock transport with authenticated REST calls and WebSocket session.
export const vaultcoreService = {
  async listAuditEvents() {
    return { data: [], error: null }
  },
  async rotateChannelKey(_channelId) {
    return { data: { rotated: false }, error: null }
  },
}
