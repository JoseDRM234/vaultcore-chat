import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const WS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) ||
  'http://localhost:4000'

export function SocketProvider({ children }) {
  const { token } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(() => new Set())
  const [typingMap, setTypingMap] = useState({}) // { [channelId]: { [userId]: userName } }

  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const s = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = s

    s.on('connect', () => {
      setSocket(s)
      setIsConnected(true)
    })

    s.on('disconnect', () => {
      setIsConnected(false)
    })

    // Actualización de presencia
    s.on('presence:status', ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (status === 'online') {
          next.add(userId)
        } else {
          next.delete(userId)
        }
        return next
      })
    })

    // Indicador de escritura
    s.on('typing:update', ({ channelId, userId, userName, isTyping }) => {
      setTypingMap((prev) => {
        const channelTyping = { ...(prev[channelId] || {}) }
        if (isTyping) {
          channelTyping[userId] = userName || 'Un usuario'
        } else {
          delete channelTyping[userId]
        }
        return {
          ...prev,
          [channelId]: channelTyping,
        }
      })
    })

    return () => {
      s.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }, [token])

  const joinChannel = useCallback((channelId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('channel:join', { channelId })
    }
  }, [])

  const leaveChannel = useCallback((channelId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('channel:leave', { channelId })
    }
  }, [])

  const sendMessage = useCallback((payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', payload)
    }
  }, [])

  const startTyping = useCallback((channelId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', { channelId })
    }
  }, [])

  const stopTyping = useCallback((channelId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:stop', { channelId })
    }
  }, [])

  const value = {
    socket,
    isConnected,
    onlineUsers,
    typingMap,
    joinChannel,
    leaveChannel,
    sendMessage,
    startTyping,
    stopTyping,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider')
  }
  return context
}
