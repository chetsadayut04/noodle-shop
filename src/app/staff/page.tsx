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
  ShoppingBag,
  Layers,
  Utensils,
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

type MenuItem = {
  id: string
  category_id: string
  name: string
  price: number
  is_available: boolean
}

const statusSteps: { key: Order['status']; label: string; next: Order['status'] | null; color: string }[] = [
  { key: 'pending', label: 'รอรับออเดอร์', next: 'preparing', color: 'bg-amber-500 text-amber-700' },
  { key: 'preparing', label: 'กำลังทำ', next: 'served', color: 'bg-blue-500 text-blue-700' },
  { key: 'served', label: 'เสิร์ฟแล้ว', next: 'paid', color: 'bg-purple-500 text-purple-700' },
  { key: 'paid', label: 'ชำระแล้ว', next: null, color: 'bg-emerald-500 text-emerald-700' },
]

export default function StaffPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'preparing' | 'served' | 'paid' | 'stock'>('active')
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null)
  const router = useRouter()

  const fetchOrdersAndMenu = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch user role
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        setUserRole(userData.user.user_metadata?.role || null)
      }

      // Fetch orders
      const { data: orderData, error: orderError } = await supabase
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

      if (orderError) throw orderError
      setOrders(orderData || [])

      // Fetch menu items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('category_id')
      setMenuItems(menuData || [])
    } catch (err) {
      console.error('Fetch staff data error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrdersAndMenu()
    const interval = setInterval(fetchOrdersAndMenu, 8000)
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

  const toggleMenuAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setMenuItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_available: !currentStatus } : item))
      )
    } catch (err) {
      console.error('Toggle menu availability error:', err)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'active') return o.status === 'pending' || o.status === 'preparing'
    return o.status === activeTab
  })

  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const preparingCount = orders.filter((o) => o.status === 'preparing').length
  const activeCount = pendingCount + preparingCount

  return (
    <main className="min-h-dvh bg-background p-4 sm:p-6 pb-24">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">ระบบจัดการห้องครัว &amp; สต็อกสินค้า</h1>
            <p className="text-xs text-muted-foreground">จัดการออเดอร์ และเปิด-ปิดสินค้าหมดแบบเรียลไทม์</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link to Admin Page if user is Admin */}
          {userRole === 'admin' && (
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
            onClick={fetchOrdersAndMenu}
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

      {/* Clean Tab Filter Bar */}
      <div className="mx-auto mt-6 max-w-6xl overflow-x-auto">
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-xs font-bold transition-colors ${
              activeTab === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            🔥 ออเดอร์ต้องทำ
            {activeCount > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] text-primary-foreground">
                {activeCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-xs font-bold transition-colors ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            รอรับออเดอร์ ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preparing')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-xs font-bold transition-colors ${
              activeTab === 'preparing'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            กำลังทำ ({preparingCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('served')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-xs font-bold transition-colors ${
              activeTab === 'served'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            เสิร์ฟแล้ว ({orders.filter((o) => o.status === 'served').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-xs font-bold transition-colors ${
              activeTab === 'paid'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            ชำระแล้ว ({orders.filter((o) => o.status === 'paid').length})
          </button>

          {/* Stock Toggle Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 font-display text-xs font-bold transition-colors ${
              activeTab === 'stock'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            <Utensils className="h-3.5 w-3.5" /> เปิด/ปิด สินค้าหมด ({menuItems.filter((i) => !i.is_available).length} หมด)
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: Menu Stock Management Panel */}
      {activeTab === 'stock' ? (
        <section className="mx-auto mt-6 max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-card-foreground">คลังเปิด-ปิดเมนูสินค้าหมด</h2>
              <p className="text-xs text-muted-foreground">เมื่อกด "สินค้าหมด" เมนูนั้นจะถูกระงับการสั่งในหน้าลูกค้าทันที</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  item.is_available ? 'border-border bg-background' : 'border-destructive/30 bg-destructive/5'
                }`}
              >
                <div>
                  <h3 className="font-display text-base font-bold text-card-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.price} บาท · หมวด: {item.category_id}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMenuAvailability(item.id, item.is_available)}
                  className={`rounded-full px-4 py-2 font-display text-xs font-bold shadow-xs transition-transform active:scale-95 ${
                    item.is_available
                      ? 'bg-emerald-500 text-white'
                      : 'bg-destructive text-destructive-foreground'
                  }`}
                >
                  {item.is_available ? '🟢 พร้อมขาย' : '🔴 สินค้าหมด'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* TAB CONTENT 2: Orders View */
        <div className="mx-auto mt-6 max-w-6xl">
          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-3 font-display text-lg font-bold text-card-foreground">ไม่มีออเดอร์ในหมวดนี้</h3>
              <p className="text-xs text-muted-foreground">ออเดอร์ใหม่จะปรากฏที่นี่แบบเรียลไทม์</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => {
                const stepObj = statusSteps.find((s) => s.key === order.status)
                const slipUrl = order.payments?.[0]?.slip_url

                return (
                  <article key={order.id} className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <span className="font-display text-xl font-bold text-primary">โต๊ะ {order.table_id}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${stepObj?.color || 'bg-secondary'}`}>
                        {stepObj?.label || order.status}
                      </span>
                    </div>

                    {/* Time & Info */}
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>เวลาสั่ง: {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-mono text-[10px]">ID: {order.id.slice(0, 8)}</span>
                    </div>

                    {/* Items List */}
                    <ul className="mt-4 flex-1 divide-y divide-border/60 text-xs">
                      {order.order_items?.map((item) => (
                        <li key={item.id} className="py-2">
                          <div className="flex justify-between font-semibold text-foreground text-sm">
                            <span>{item.name} × {item.qty}</span>
                            <span>{item.price * item.qty}฿</span>
                          </div>
                          {item.order_item_options && item.order_item_options.length > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-1.5">
                              {item.order_item_options.map((opt) => opt.name).join(' · ')}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Total & Slip */}
                    <div className="mt-4 border-t border-border pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">ยอดเงินรวม:</span>
                        <span className="font-display text-lg font-bold text-primary">{order.total} บาท</span>
                      </div>

                      {slipUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedSlip(slipUrl)}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
                        >
                          <Eye className="h-4 w-4 text-primary" /> ดูสลิปเงินโอน
                        </button>
                      )}

                      {/* Advance Status Button */}
                      {stepObj?.next && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, stepObj.next!)}
                          className="mt-3 w-full rounded-2xl bg-primary py-3 font-display text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-95"
                        >
                          เปลี่ยนสถานะเป็น → {statusSteps.find((s) => s.key === stepObj.next)?.label}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

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
