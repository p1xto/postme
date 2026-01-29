'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username

  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [password, setPassword] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadUser()
  }, [username])

  useEffect(() => {
    if (user) {
      loadMessages()
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `user_id=eq.${user.id}`
        }, () => loadMessages())
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'replies'
        }, () => loadMessages())
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadUser = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setUser(data)
      }
    } catch (err) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!user) return

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (messagesData) {
      const messagesWithReplies = await Promise.all(
        messagesData.map(async (msg) => {
          const { data: replies } = await supabase
            .from('replies')
            .select('*')
            .eq('message_id', msg.id)
            .order('created_at', { ascending: true })
          return { ...msg, replies: replies || [] }
        })
      )
      setMessages(messagesWithReplies)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === user.password) {
      setIsAdmin(true)
      setShowLoginModal(false)
      setPassword('')
    } else {
      alert('비밀번호가 틀렸습니다')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await supabase.from('messages').insert({
        user_id: user.id,
        content: newMessage.trim()
      })
      setNewMessage('')
      loadMessages()
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !replyingTo) return

    try {
      await supabase.from('replies').insert({
        message_id: replyingTo,
        content: replyText.trim()
      })
      setReplyText('')
      setReplyingTo(null)
      loadMessages()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('replies').delete().eq('message_id', messageId)
    await supabase.from('messages').delete().eq('id', messageId)
    loadMessages()
  }

  const handleDeleteReply = async (replyId) => {
    await supabase.from('replies').delete().eq('id', replyId)
    loadMessages()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    
    const timeStr = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
    
    if (diff < 86400000) {
      return timeStr
    } else if (diff < 172800000) {
      return `어제 ${timeStr}`
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + ' ' + timeStr
    }
  }

  const groupMessagesByDate = () => {
    const groups = []
    let currentDate = null
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toDateString()
      if (msgDate !== currentDate) {
        currentDate = msgDate
        const d = new Date(msg.created_at)
        const now = new Date()
        const diff = now - d
        
        let label
        if (diff < 86400000) {
          label = '오늘'
        } else if (diff < 172800000) {
          label = '어제'
        } else {
          label = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
        }
        groups.push({ type: 'date', label })
      }
      groups.push({ type: 'message', data: msg })
    })
    
    return groups
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
        <h1 className="text-xl font-semibold mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-gray-500 mb-6">@{username}</p>
        <Link href="/" className="text-sm text-blue-500">
          홈으로 돌아가기
        </Link>
      </div>
    )
  }

  const groupedMessages = groupMessagesByDate()

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 pt-14 bg-white">
        <Link href="/" className="p-2 -ml-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center border-2 border-black">
            <span className="text-white text-sm font-bold">
              {user.display_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xl font-semibold">{user.display_name}</span>
        </div>
        
        <button
          onClick={() => isAdmin ? setIsAdmin(false) : setShowLoginModal(true)}
          className="text-sm text-gray-400"
        >
          {isAdmin ? '나가기' : '관리'}
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p className="text-base">아직 메시지가 없어요</p>
            <p className="text-sm mt-1">첫 번째 메시지를 보내보세요!</p>
          </div>
        ) : (
          groupedMessages.map((item, index) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${index}`} className="text-center text-sm text-gray-400 my-4">
                  {item.label}
                </div>
              )
            }
            
            const msg = item.data
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isAdmin={isAdmin}
                user={user}
                onSwipeReply={() => {
                  if (isAdmin && msg.replies.length === 0) {
                    setReplyingTo(msg.id)
                    setTimeout(() => inputRef.current?.focus(), 100)
                  }
                }}
                onDelete={() => handleDeleteMessage(msg.id)}
                onDeleteReply={handleDeleteReply}
                formatDate={formatDate}
              />
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && isAdmin && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="w-1 h-10 bg-blue-500 rounded-full"></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-500">답장</p>
            <p className="text-sm text-gray-500 truncate">
              {messages.find(m => m.id === replyingTo)?.content}
            </p>
          </div>
          <button 
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-8 pt-2 bg-white">
        <form 
          onSubmit={replyingTo && isAdmin ? (e) => { e.preventDefault(); handleReply(); } : handleSendMessage}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={replyingTo && isAdmin ? replyText : newMessage}
            onChange={(e) => replyingTo && isAdmin ? setReplyText(e.target.value) : setNewMessage(e.target.value)}
            placeholder={replyingTo && isAdmin ? "답장 입력..." : "메시지 보내기..."}
            className="flex-1 py-2 bg-transparent border-b border-gray-200 focus:border-gray-400 outline-none text-base transition-colors"
          />
          <button
            type="submit"
            disabled={sending}
            className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-full text-white disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-center mb-4">관리자 로그인</h2>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full py-3 px-4 border border-gray-200 rounded-xl outline-none text-center mb-3"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium"
              >
                로그인
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// 메시지 버블 컴포넌트 (스와이프 답장)
function MessageBubble({ message, isAdmin, user, onSwipeReply, onDelete, onDeleteReply, formatDate }) {
  const [swipeX, setSwipeX] = useState(0)
  const [startX, setStartX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = (e) => {
    if (!isAdmin || message.replies.length > 0) return
    setStartX(e.touches[0].clientX)
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (!isSwiping) return
    const diff = e.touches[0].clientX - startX
    if (diff > 0) setSwipeX(Math.min(diff, 80))
  }

  const handleTouchEnd = () => {
    if (swipeX > 50) onSwipeReply()
    setSwipeX(0)
    setIsSwiping(false)
  }

  return (
    <div className="mb-3 animate-fadeIn">
      {/* 익명 메시지 (회색) */}
      <div
        className="flex items-center gap-2 relative"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 스와이프 아이콘 */}
        {isAdmin && message.replies.length === 0 && (
          <div 
            className="absolute -left-8 w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center"
            style={{ opacity: swipeX / 80 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3B82F6">
              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
            </svg>
          </div>
        )}
        
        <div className="max-w-[80%] px-4 py-3 bg-[#E5E5EA] rounded-2xl">
          <p className="text-base leading-relaxed break-words">{message.content}</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={onDelete}
            className="text-gray-300 hover:text-red-400 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* 관리자 답변 (파란색) */}
      {message.replies.map((reply) => (
        <div key={reply.id} className="flex items-end gap-1 mt-2 ml-2">
          <div className="max-w-[75%] px-4 py-3 bg-blue-500 rounded-2xl rounded-br-sm">
            <p className="text-base text-white leading-relaxed break-words">{reply.content}</p>
          </div>
          {/* 꼬리 */}
          <svg width="8" height="12" viewBox="0 0 8 12" fill="#3B82F6" className="-ml-1 mb-0">
            <path d="M0 0 C0 0 0 12 8 12 L8 0 C3 0 0 0 0 0Z"/>
          </svg>
          
          {isAdmin && (
            <button 
              onClick={() => onDeleteReply(reply.id)}
              className="text-gray-300 hover:text-red-400 transition-colors ml-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
