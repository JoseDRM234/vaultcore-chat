import { useState, useEffect } from 'react'
import { Download, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, FileText, Lock } from 'lucide-react'
import { auditService } from '@/services/vaultcore-api'

const PAGE_SIZE = 15

export default function AppAudit() {
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadEvents() {
      try {
        const result = await auditService.listEvents(PAGE_SIZE, page * PAGE_SIZE)
        if (!ignore) {
          setEvents(result.data || [])
          setTotal(result.total || 0)
          setLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    loadEvents()

    return () => {
      ignore = true
    }
  }, [page])

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await auditService.listEvents(PAGE_SIZE, page * PAGE_SIZE)
      setEvents(result.data || [])
      setTotal(result.total || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      await auditService.exportCsv()
    } catch (err) {
      alert(`Error al exportar log de auditoría: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="p-6 sm:p-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Auditor View / Strict Read-Only
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compliance view with immutable event trails and cryptographic provenance verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            <Download className="size-4" />
            {exporting ? 'Exporting CSV…' : 'Export requested'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-500 border border-rose-500/20">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <FileText className="mx-auto size-8 text-muted-foreground mb-2" />
            No audit events found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((event) => {
              const dateObj = new Date(event.timestamp)
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              const dateStr = dateObj.toLocaleDateString()

              return (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 p-5 hover:bg-muted/20 transition sm:flex-row sm:items-center"
                >
                  <div className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                    <div>{timeStr}</div>
                    <div className="text-[10px] text-muted-foreground/70">{dateStr}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground font-mono">{event.action}</p>
                      {event.targetResource && (
                        <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          {event.targetResource}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{event.actorEmail || 'System'}</span> ·{' '}
                      {event.detail}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] uppercase text-muted-foreground">
                    <Lock className="size-3" /> Read only
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground bg-muted/20">
          <div>
            Showing {events.length > 0 ? page * PAGE_SIZE + 1 : 0} to{' '}
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total} events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-mono">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
