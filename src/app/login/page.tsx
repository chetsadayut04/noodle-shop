'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Lock, Mail, Loader2, Utensils } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      const role = data.user?.user_metadata?.role
      if (role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/staff')
      }
      router.refresh()
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Utensils className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-card-foreground">เข้าสู่ระบบสำหรับพนักงาน</h1>
          <p className="mt-1 text-sm text-muted-foreground">จัดการออเดอร์และเมนูอาหาร (Staff / Admin)</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-2xl bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
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
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-50"
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
      </div>
    </main>
  )
}
