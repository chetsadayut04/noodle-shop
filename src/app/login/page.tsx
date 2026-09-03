'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Lock, Mail, Loader2, Utensils, Shield, UserCheck } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const userRole = data.user?.user_metadata?.role
      if (userRole === 'admin') {
        router.push('/admin')
      } else {
        router.push('/staff')
      }
      router.refresh()
    } catch (err: any) {
      console.error('Auth error:', err)
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Utensils className="h-7 w-7" />
          </div>
          <span className="mt-3 inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-900">
            🍜 ร้านแม่แต๋
          </span>
          <h1 className="mt-2 font-display text-2xl font-bold text-card-foreground">
            เข้าสู่ระบบจัดการร้าน
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            สำหรับพนักงานห้องครัวและผู้ดูแลระบบ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-center text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-card-foreground">อีเมล (Email)</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@noodle.com"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-card-foreground">รหัสผ่าน (Password)</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-primary to-amber-900 py-3.5 font-display text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> กำลังเข้าสู่ระบบ...
              </>
            ) : (
              'เข้าสู่ระบบ (Sign In)'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground border-t border-border pt-4">
          🔒 ระบบภายในเฉพาะพนักงานและผู้ดูแลร้านแม่แต๋เท่านั้น
        </div>
      </div>
    </main>
  )
}
