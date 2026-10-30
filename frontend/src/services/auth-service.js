const users = {
  'admin@vaultcore.test': { id: 'usr_admin', name: 'Alex Morgan', email: 'admin@vaultcore.test', role: 'admin', firstAccess: false },
  'member@vaultcore.test': { id: 'usr_member', name: 'Jordan Miller', email: 'member@vaultcore.test', role: 'member', firstAccess: true },
  'auditor@vaultcore.test': { id: 'usr_auditor', name: 'Riley Chen', email: 'auditor@vaultcore.test', role: 'auditor', firstAccess: false },
}

export const authService = {
  async login(email, _password) {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    const user = users[email.trim().toLowerCase()]
    if (!user) throw new Error('Credenciales no reconocidas. Usa una cuenta demo válida.')
    const result = { ...user }
    user.firstAccess = false
    return result
  },
  demoLogin(role) {
    return Object.values(users).find((user) => user.role === role)
  },
}
