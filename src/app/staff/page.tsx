'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Clock,
  ChefHat,
  CheckCircle2,
  DollarSign,
  LogOut,
  RefreshCw,
  Eye,
  UtensilsCrossed,
  ShieldAlert,
  Store,
} from 'lucide-react'

type OrderItemOption = {
  id: string
  name: string
  extra_price: number
}

type OrderItem = {
  id: string
  name: string
  price: number
  qty: number
  order_item_options?: OrderItemOption[]
}

type Payment = {
  id: string
  slip_url: string | null
  status: string
}

type Order = {
  id: string
  table_id: string
  status: 'pending' | 'preparing' | 'served' | 'paid'
  total: number
  created_at: string
  order_items?: OrderItem[]
  payments?: Payment[]
}

const statusSteps: { key: Order['status']; label: string; next: Order['status'] | null; color: string }[] = [
  { key: 'pending', label: 'รอรับออเดอร์', next: 'preparing', color: 'bg-amber-500' },
  { key: 'preparing', label: 'กำลังทำ', next: 'served', color: 'bg-blue-500' },
  { key: 'served', label: 'เสิร์ฟแล้ว', next: 'paid', color: 'bg-purple-500' },
  { key: 'paid', label: 'ชำระแล้ว', next: null, color: 'bg-emerald-500' },
]

export default function StaffPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null)
  const router = useRouter()

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch user role
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        setUserRole(userData.user.user_metadata?.role || null)
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            order_item_options (*)
          ),
          payments (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Fetch orders error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 8000)
    return () => clearInterval(interval)
  }, [])

  const updateOrderStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)

      if (error) throw error

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      )
    } catch (err) {
      console.error('Update order status error:', err)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="min-h-dvh bg-background p-4 sm:p-6">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">ระบบจัดการออเดอร์ (Staff Dashboard)</h1>
            <p className="text-xs text-muted-foreground">ติดตามสถานะอาหาร: pending → preparing → served → paid</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link to Admin Page if user is Admin */}
          {(userRole === 'admin' || true) && (
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <ShieldAlert className="h-3.5 w-3.5" /> กลับหน้า Admin
            </button>
          )}

          <button
            type="button"
            onClick={fetchOrders}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-transform active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
          >
            <LogOut className="h-3.5 w-3.5" /> ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Board Columns */}
      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statusSteps.map((step) => {
          const stepOrders = orders.filter((o) => o.status === step.key)
          return (
            <section key={step.key} className="flex flex-col rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${step.color}`} />
                  <h2 className="font-display text-lg font-bold text-card-foreground">{step.label}</h2>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 font-display text-xs font-bold text-secondary-foreground">
                  {stepOrders.length}
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
                {stepOrders.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">ไม่มีรายการ</p>
                ) : (
                  stepOrders.map((order) => {
                    const slipUrl = order.payments?.[0]?.slip_url
                    return (
                      <div key={order.id} className="rounded-2xl border border-border bg-background p-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="font-display text-base font-bold text-primary">โต๊ะ {order.table_id}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Order Items */}
                        <ul className="mt-3 divide-y divide-border/60 text-xs">
                          {order.order_items?.map((item) => (
                            <li key={item.id} className="py-1.5">
                              <div className="flex justify-between font-semibold text-foreground">
                                <span>{item.name} × {item.qty}</span>
                                <span>{item.price * item.qty}฿</span>
                              </div>
                              {item.order_item_options && item.order_item_options.length > 0 && (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {item.order_item_options.map((opt) => opt.name).join(' · ')}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                          <span className="font-semibold text-muted-foreground">รวมราคาทั้งหมด:</span>
                          <span className="font-display text-sm font-bold text-primary">{order.total} บาท</span>
                        </div>

                        {slipUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedSlip(slipUrl)}
                            className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-secondary/80 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary"
                          >
                            <Eye className="h-3.5 w-3.5" /> ดูสลิปเงินโอน
                          </button>
                        )}

                        {/* Action Buttons */}
                        {step.next && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, step.next!)}
                            className="mt-3 w-full rounded-xl bg-primary py-2 font-display text-xs font-bold text-primary-foreground shadow-xs transition-transform active:scale-95"
                          >
                            เปลี่ยนสถานะเป็น → {statusSteps.find((s) => s.key === step.next)?.label}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* Slip Modal View */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setSelectedSlip(null)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10 max-h-[85vh] w-full max-w-sm rounded-3xl bg-card p-4 shadow-2xl">
            <button type="button" onClick={() => setSelectedSlip(null)} className="absolute right-3 top-3 rounded-full bg-secondary p-1.5">
              ✕
            </button>
            <h3 className="mb-3 font-display text-base font-bold text-card-foreground">สลิปการโอนเงิน</h3>
            <img src={selectedSlip} alt="Slip" className="mx-auto max-h-[70vh] rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </main>
  )
}
