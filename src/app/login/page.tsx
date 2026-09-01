'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Lock, Mail, Loader2, Utensils, Shield, UserCheck } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const supabase = createClient()

      if (mode === 'login') {
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
      } else {
        // Sign Up Mode
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
            },
          },
        })

        if (authError) throw authError

        setSuccessMessage('สร้างบัญชีสำเร็จแล้ว! กำลังเข้าสู่ระบบ...')
        
        // Auto login if session exists or redirect
        if (data.session) {
          setTimeout(() => {
            if (role === 'admin') {
              router.push('/admin')
            } else {
              router.push('/staff')
            }
            router.refresh()
          }, 1500)
        } else {
          // If email confirmation is disabled or required
          setMode('login')
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ/สมัครสมาชิก')
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
          <h1 className="mt-4 font-display text-2xl font-bold text-card-foreground">
            {mode === 'login' ? 'เข้าสู่ระบบสำหรับพนักงาน' : 'สมัครบัญชี Staff / Admin'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login' ? 'เข้าสู่ระบบเพื่อจัดการออเดอร์และเมนูอาหาร' : 'สร้างบัญชีเพื่อเข้าใช้งานหน้าครัวและแอดมิน'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-6 flex rounded-2xl bg-secondary p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMessage(null) }}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${mode === 'login' ? 'bg-card text-card-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            เข้าสู่ระบบ (Sign In)
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccessMessage(null) }}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${mode === 'signup' ? 'bg-card text-card-foreground shadow-xs' : 'text-muted-foreground'}`}
          >
            สมัครสมาชิก (Sign Up)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-2xl bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-600">
              {successMessage}
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

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-card-foreground">สิทธิ์ผู้ใช้งาน (Role)</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-bold ${role === 'staff' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-card-foreground'}`}
                >
                  <UserCheck className="h-4 w-4" /> Staff (พนักงาน)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-bold ${role === 'admin' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-card-foreground'}`}
                >
                  <Shield className="h-4 w-4" /> Admin (ผู้ดูแล)
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> กำลังดำเนินการ...
              </>
            ) : mode === 'login' ? (
              'เข้าสู่ระบบ (Sign In)'
            ) : (
              'สร้างบัญชีผู้ใช้งาน (Sign Up)'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
