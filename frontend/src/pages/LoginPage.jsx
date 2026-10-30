import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, ShieldCheck, Sun, Moon, UserRound } from 'lucide-react'
import { authService } from '@/services/auth-service'
import { useTheme } from '@/components/theme-provider'

const roles = [
  { role: 'member', label: 'Member', description: 'Encrypted conversations' },
  { role: 'admin', label: 'Admin', description: 'Control plane access' },
  { role: 'auditor', label: 'Auditor', description: 'Read-only compliance view' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)

  function redirect(role) {
    navigate(role === 'admin' ? '/admin/dashboard' : role === 'auditor' ? '/app/audit' : '/app/chats')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await authService.login(email, password)
      if (user.firstAccess) {
        setInitializing(true)
        // TODO: Generate a local RSA key pair and PBKDF2-encrypt the private key with Web Crypto.
        window.setTimeout(() => redirect(user.role), 1800)
      } else {
        redirect(user.role)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.')
      setLoading(false)
    }
  }

  function demo(role) {
    setLoading(true)
    window.setTimeout(() => redirect(authService.demoLogin(role).role), 350)
  }

  if (initializing) {
    return (
      <main className="login-shell grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-cyan-300 text-[#07111f]">
            <ShieldCheck className="size-8" />
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">First access</p>
          <h1 className="mt-4 text-3xl font-semibold">Inicializando cifrado...</h1>
          <p className="mt-3 max-w-sm text-sm text-slate-400">
            Generando tu identidad local y protegiendo la clave privada.
          </p>
          <div className="mx-auto mt-8 h-1 w-56 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="login-shell min-h-screen text-slate-100 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="login-hero hidden flex-col justify-between border-r p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-[#07111f]">
            <ShieldCheck className="size-5" />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight">
            VAULT<span className="text-cyan-300">CORE</span>
          </span>
        </div>
        <div className="max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
            Secure communications infrastructure
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-pretty">
            Private by design. Accountable by default.
          </h1>
          <p className="mt-6 leading-7 text-slate-400">
            A zero-knowledge workspace for teams that need sensitive conversations, governed access, and a complete audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <LockKeyhole className="size-4" /> End-to-end encrypted workspace
        </div>
      </section>
      <section className="login-panel flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="grid size-9 place-items-center rounded-lg bg-cyan-400 text-[#07111f]">
                <ShieldCheck className="size-5" />
              </div>
              <span className="font-mono font-bold">
                VAULT<span className="text-cyan-300">CORE</span>
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="ml-auto rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-cyan-300"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
            Secure access portal
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to VaultCore</h2>
          <p className="mt-2 text-sm text-slate-400">
            Usa tus credenciales para entrar a tu espacio gobernado.
          </p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Password
              <input
                required
                minLength={4}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-rose-400">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-semibold text-[#07111f] transition hover:bg-cyan-200 disabled:opacity-70"
            >
              {loading ? 'Authenticating…' : 'Sign in securely'}
              <ArrowRight className="size-4" />
            </button>
          </form>
          <div className="my-8 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-slate-600">
            <span className="h-px flex-1 bg-slate-800" />
            Or explore as a demo role
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="flex flex-col gap-2">
            {roles.map(({ role, label, description }) => (
              <button
                key={role}
                type="button"
                onClick={() => demo(role)}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3 text-left transition hover:border-cyan-300/60"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-800 text-slate-400">
                    <UserRound className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-slate-500">{description}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-slate-600" />
              </button>
            ))}
          </div>
          <p className="mt-6 text-center font-mono text-[11px] text-slate-600">
            Demo environment · shortcuts skip encryption setup
          </p>
        </div>
      </section>
    </main>
  )
}
