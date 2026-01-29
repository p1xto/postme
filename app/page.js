'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserPage() {
  const params = useParams()
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
        .channel('messages-channel')
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

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !replyingTo || sending) return

    setSending(true)
    try {
      const { error } = await supabase.from('replies').insert({
        message_id: replyingTo,
        content: replyText.trim()
      })
      if (error) {
        console.error('Reply error:', error)
        alert('답장 등록에 실패했습니다')
      } else {
        setReplyText('')
        setReplyingTo(null)
        await loadMessages()
      }
    } catch (err) {
      console.error(err)
      alert('답장 등록에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('replies').delete().eq('message_id', messageId)
    await supabase.from('messages').delete().eq('id', messageId)
    loadMessages()
  }

  const handleDeleteReply = async (replyId) => {
    if (!confirm('답글을 삭제하시겠습니까?')) return
    await supabase.from('replies').delete().eq('id', replyId)
    loadMessages()
  }

  const startReply = (messageId) => {
    setReplyingTo(messageId)
    setReplyText('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyText('')
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
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 pt-14 bg-white border-b border-gray-100">
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
          className={`text-sm p-2 -mr-2 ${isAdmin ? 'text-blue-500 font-medium' : 'text-gray-400'}`}
        >
          {isAdmin ? '나가기' : '관리'}
        </button>
      </header>

      {/* Admin Mode Indicator */}
      {isAdmin && (
        <div className="bg-blue-50 px-4 py-2 text-center text-sm text-blue-600 font-medium">
          👑 관리자 모드 · 메시지를 탭하여 답장하세요
        </div>
      )}

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
            const hasNoReply = msg.replies.length === 0
            
            return (
              <div key={msg.id} className="mb-4 animate-fadeIn">
                {/* 익명 메시지 - 회색, 왼쪽 정렬 */}
                <div className="flex items-start gap-2">
                  <div 
                    className={`max-w-[80%] px-4 py-3 bg-[#E5E5EA] rounded-2xl rounded-tl-sm ${isAdmin && hasNoReply ? 'cursor-pointer active:bg-[#D1D1D6]' : ''}`}
                    onClick={() => isAdmin && hasNoReply && startReply(msg.id)}
                  >
                    <p className="text-base leading-relaxed break-words">{msg.content}</p>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-1 pt-2">
                      {hasNoReply && (
                        <button 
                          onClick={() => startReply(msg.id)}
                          className="text-blue-500 hover:text-blue-600 active:scale-95 transition-all p-1"
                          title="답장"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                          </svg>
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-gray-300 hover:text-red-400 active:scale-95 transition-all p-1"
                        title="삭제"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* 관리자 답변 - 파란색, 오른쪽 정렬 */}
                {msg.replies.map((reply) => (
                  <div key={reply.id} className="flex justify-end items-start gap-2 mt-2">
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteReply(reply.id)}
                        className="text-gray-300 hover:text-red-400 active:scale-95 transition-all p-1 pt-2"
                        title="삭제"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    )}
                    <div className="max-w-[80%] px-4 py-3 bg-blue-500 rounded-2xl rounded-tr-sm">
                      <p className="text-base text-white leading-relaxed break-words">{reply.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && isAdmin && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-blue-50 border-t border-blue-100">
          <div className="w-1 h-10 bg-blue-500 rounded-full flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-600">답장 작성 중</p>
            <p className="text-sm text-gray-500 truncate">
              {messages.find(m => m.id === replyingTo)?.content}
            </p>
          </div>
          <button 
            onClick={cancelReply}
            className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-white border-t border-gray-100">
        <form 
          onSubmit={replyingTo && isAdmin ? handleReply : handleSendMessage}
          className="flex items-center gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={replyingTo && isAdmin ? replyText : newMessage}
            onChange={(e) => replyingTo && isAdmin ? setReplyText(e.target.value) : setNewMessage(e.target.value)}
            placeholder={replyingTo && isAdmin ? "답장을 입력하세요..." : "익명으로 메시지 보내기..."}
            className={`flex-1 py-3 px-4 rounded-full outline-none text-base transition-colors ${
              replyingTo && isAdmin 
                ? 'bg-blue-50 focus:bg-blue-100 border-2 border-blue-200' 
                : 'bg-gray-100 focus:bg-gray-200'
            }`}
          />
          <button
            type="submit"
            disabled={sending || (replyingTo && isAdmin ? !replyText.trim() : !newMessage.trim())}
            className="w-10 h-10 flex items-center justify-center bg-blue-500 rounded-full text-white disabled:opacity-40 flex-shrink-0 active:scale-95 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                className="w-full py-3 px-4 border border-gray-200 rounded-xl outline-none text-center mb-3 focus:border-blue-400"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium active:bg-blue-600"
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
