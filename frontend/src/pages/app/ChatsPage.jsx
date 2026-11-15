import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Send,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import { channelsService } from '@/services/vaultcore-api'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'
import { useCrypto } from '@/context/CryptoContext'

function getInitials(name) {
  if (!name) return 'CH'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ChatsPage() {
  const { user } = useAuth()
  const { socket, isConnected, onlineUsers, typingMap, joinChannel, leaveChannel, sendMessage, startTyping, stopTyping } =
    useSocket()
  const { encryptText, decryptText } = useCrypto()

  const [channels, setChannels] = useState([])
  const [activeChannelId, setActiveChannelId] = useState(null)
  const [channelSearch, setChannelSearch] = useState('')
  const [channelsLoading, setChannelsLoading] = useState(true)

  const [messages, setMessages] = useState([])
  const [decryptedMap, setDecryptedMap] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 1. Cargar canales del usuario sin sincronizar setState en effect
  useEffect(() => {
    let ignore = false

    async function loadChannels() {
      try {
        const data = await channelsService.list()
        if (!ignore) {
          setChannels(data)
          if (data.length > 0) {
            setActiveChannelId((prev) => prev || data[0].id)
          }
          setChannelsLoading(false)
        }
      } catch (err) {
        if (!ignore) {
          setError('Error al cargar conversaciones: ' + err.message)
          setChannelsLoading(false)
        }
      }
    }

    loadChannels()

    return () => {
      ignore = true
    }
  }, [])

  const activeChannel = channels.find((c) => c.id === activeChannelId) || null

  // 2. Unirse al canal activo por WebSocket y cargar mensajes
  useEffect(() => {
    if (!activeChannelId) return

    joinChannel(activeChannelId)

    let isMounted = true

    async function loadMessages() {
      try {
        const msgs = await channelsService.getMessages(activeChannelId)
        if (!isMounted) return
        setMessages(msgs)

        // Descifrar mensajes al vuelo
        const decryptedBatch = {}
        for (const msg of msgs) {
          const plain = await decryptText(
            activeChannelId,
            msg.ciphertext,
            msg.iv,
            activeChannel?.encryptedChannelKey
          )
          decryptedBatch[msg.id] = plain
        }
        if (isMounted) {
          setDecryptedMap(decryptedBatch)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error al cargar mensajes:', err)
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
      leaveChannel(activeChannelId)
    }
  }, [activeChannelId, joinChannel, leaveChannel, decryptText, activeChannel?.encryptedChannelKey])

  // Scroll abajo al actualizar mensajes
  useEffect(() => {
    scrollToBottom()
  }, [messages, decryptedMap])

  // 3. Escuchar evento WebSocket 'message:new'
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = async (newMsg) => {
      if (newMsg.channelId === activeChannelId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })

        // Descifrar mensaje nuevo recibido
        const plain = await decryptText(
          activeChannelId,
          newMsg.ciphertext,
          newMsg.iv,
          activeChannel?.encryptedChannelKey
        )
        setDecryptedMap((prev) => ({
          ...prev,
          [newMsg.id]: plain,
        }))
      }
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [socket, activeChannelId, decryptText, activeChannel?.encryptedChannelKey])

  // 4. Manejo de escritura con debounce
  const handleInputChange = (e) => {
    const val = e.target.value
    setText(val)

    if (!activeChannelId) return

    startTyping(activeChannelId)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeChannelId)
    }, 1500)
  }

  // 5. Envío de mensaje cifrado E2EE
  const handleSendMessage = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !activeChannelId || sending) return

    setSending(true)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      stopTyping(activeChannelId)
    }

    try {
      // 1. Cifrar con la clave simétrica del canal
      const { ciphertext, iv } = await encryptText(
        activeChannelId,
        trimmed,
        activeChannel?.encryptedChannelKey
      )

      // 2. Enviar vía WebSocket con fallback a REST
      if (isConnected) {
        sendMessage({
          channelId: activeChannelId,
          ciphertext,
          iv,
        })
      } else {
        const saved = await channelsService.sendMessage(activeChannelId, { ciphertext, iv })
        setMessages((prev) => [...prev, saved])
        setDecryptedMap((prev) => ({ ...prev, [saved.id]: trimmed }))
      }

      setText('')
    } catch (err) {
      alert(`Error al cifrar y enviar mensaje: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  // Usuarios escribiendo en el canal actual
  const currentTypingUsers = Object.entries(typingMap[activeChannelId] || {})
    .filter(([userId]) => userId !== user?.id)
    .map(([, name]) => name)

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar de Canales y Grupos */}
      <section className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Workspace
              </p>
              <h1 className="mt-1 font-semibold text-foreground">Encrypted Chats</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`size-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                title={isConnected ? 'WebSocket conectado' : 'Conectando WebSocket…'}
              />
              <span className="font-mono text-[10px] text-muted-foreground">{onlineUsers.size} online</span>
            </div>
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-1 text-xs text-rose-500">
              <AlertCircle className="size-3 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Search className="size-4 shrink-0" />
            <input
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {channelsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No active conversations found.
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isActive = channel.id === activeChannelId
              const initials = getInitials(channel.name)
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs font-semibold text-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-sm font-medium text-foreground">{channel.name}</p>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground capitalize">
                      {channel.policy || 'standard'} · {channel.role || 'member'}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </section>

      {/* Área Central de Conversación */}
      <section className="flex min-w-0 flex-1 flex-col bg-background">
        {activeChannel ? (
          <>
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{activeChannel.name}</p>
                <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  <LockKeyhole className="size-3" /> End-to-end encrypted (AES-256-GCM)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <ShieldCheck className="size-3.5 text-emerald-500" /> Zero-Knowledge
                </span>
              </div>
            </header>

            {/* Feed de Mensajes */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <LockKeyhole className="size-8 text-cyan-500 mb-2 opacity-60" />
                  <p className="font-medium text-foreground">This conversation is end-to-end encrypted</p>
                  <p className="mt-1 text-xs max-w-sm">
                    No one outside this channel, not even VaultCore servers, can read your messages.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id
                  const decrypted = decryptedMap[msg.id]
                  const senderName = msg.sender?.fullName || (isMe ? 'You' : 'Member')
                  const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                        <span className="font-medium">{senderName}</span>
                        <span className="font-mono text-[10px]">{timeStr}</span>
                      </div>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm border border-border/50'
                        }`}
                      >
                        {decrypted !== undefined ? (
                          decrypted
                        ) : (
                          <span className="italic opacity-60">Descifrando payload…</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Indicador de Escritura */}
            {currentTypingUsers.length > 0 && (
              <div className="px-5 sm:px-8 py-1 text-xs font-mono text-cyan-600 dark:text-cyan-400 animate-pulse">
                {currentTypingUsers.join(', ')} is typing…
              </div>
            )}

            {/* Input de Envío */}
            <form
              onSubmit={handleSendMessage}
              className="shrink-0 p-4 sm:px-8 border-t border-border bg-card flex items-center gap-3"
            >
              <input
                value={text}
                onChange={handleInputChange}
                placeholder="Write an encrypted message…"
                disabled={sending}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                aria-label="Send message"
                className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
              >
                <Send className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <MessageSquare className="size-10 mb-3 opacity-40" />
            <p className="font-medium text-foreground">Select a channel</p>
            <p className="mt-1 text-sm">Choose an encrypted conversation from the sidebar to start chatting.</p>
          </div>
        )}
      </section>
    </div>
  )
}
