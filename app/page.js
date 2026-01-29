'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState('home')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요')
      return
    }

    if (username.length < 3) {
      setError('아이디는 3자 이상이어야 합니다')
      return
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('아이디는 영문 소문자, 숫자, _만 사용 가능합니다')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .single()

      if (existing) {
        setError('이미 사용 중인 아이디입니다')
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          username: username.toLowerCase(),
          password: password,
          display_name: displayName || username,
          bio: bio || '무엇이든 물어보세요'
        })

      if (insertError) throw insertError

      router.push(`/${username.toLowerCase()}`)
    } catch (err) {
      setError('생성 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVisit = (e) => {
    e.preventDefault()
    if (username.trim()) {
      router.push(`/${username.toLowerCase()}`)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center border-[3px] border-black">
            <span className="text-white text-3xl font-bold">P</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2">postme</h1>
          <p className="text-gray-500 text-sm">익명 메시지를 주고받는 공간</p>
        </div>

        {mode === 'home' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 transition-colors"
            >
              내 페이지 만들기
            </button>
            <button
              onClick={() => setMode('visit')}
              className="w-full py-4 bg-white border border-gray-200 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
            >
              페이지 방문하기
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">아이디</label>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-400">
                <span className="pl-4 text-gray-400 text-sm">postme.app/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="myname"
                  className="flex-1 py-3 pr-4 outline-none text-sm"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="관리자 비밀번호"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">표시 이름 (선택)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="화면에 표시될 이름"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">소개 (선택)</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="무엇이든 물어보세요"
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? '생성 중...' : '만들기'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('home'); setError('') }}
              className="w-full py-3 text-gray-500 text-sm"
            >
              돌아가기
            </button>
          </form>
        )}

        {mode === 'visit' && (
          <form onSubmit={handleVisit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">방문할 페이지</label>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-400">
                <span className="pl-4 text-gray-400 text-sm">postme.app/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="username"
                  className="flex-1 py-3 pr-4 outline-none text-sm"
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 transition-colors"
            >
              방문하기
            </button>

            <button
              type="button"
              onClick={() => setMode('home')}
              className="w-full py-3 text-gray-500 text-sm"
            >
              돌아가기
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
