'use client'

import { useState, useEffect, useRef } from 'react'
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
  Utensils,
  X,
  ArrowRight,
  Check,
  Volume2,
  VolumeX,
  Bell,
  Banknote,
  Smartphone,
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
  payment_method?: string | null
  method?: string | null
}

type Order = {
  id: string
  table_id: string
  status: 'pending' | 'preparing' | 'served' | 'paid'
  total: number
  created_at: string
  payment_method?: string | null
  order_items: OrderItem[]
  payments?: Payment[]
}

type MenuItem = {
  id: string
  name: string
  price: number
  image_url: string
  is_available: boolean
  category_id: string
}

let sharedAudioCtx: AudioContext | null = null

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx()
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume()
  }
  return sharedAudioCtx
}

// Global Thai voice cache for instant zero-delay playback
let cachedThaiVoice: SpeechSynthesisVoice | null = null

const updateThaiVoiceCache = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const voices = window.speechSynthesis.getVoices()
  const thai = voices.find(
    (v) =>
      v.lang.includes('th') ||
      v.lang === 'th-TH' ||
      v.name.includes('Thai') ||
      v.name.includes('Kanya') ||
      v.name.includes('Narisa')
  )
  if (thai) cachedThaiVoice = thai
}

const playOrderSound = (tableId?: string) => {
  // 1. Play snappy, crisp high-pitch chime (Ding! ~0.15s)
  try {
    const ctx = getAudioContext()
    if (ctx) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      // Pleasant bright bell note: 1046.5Hz (C6) with quick crystal decay
      osc.frequency.setValueAtTime(1046.5, now)
      gain.gain.setValueAtTime(0.45, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.18)
    }
  } catch (err) {
    console.error('Play chime sound error:', err)
  }

  // 2. Play Thai Siri announcement immediately after ding (only 80ms delay!)
  setTimeout(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel() // Cancel any previous speech queue immediately
        const cleanTable = tableId ? tableId.replace(/^t/i, '') : ''
        const message = cleanTable ? `มีออเดอร์ใหม่ โต๊ะ ${cleanTable} ค่ะ` : `มีออเดอร์ใหม่ เข้ามาค่ะ`
        const utterance = new SpeechSynthesisUtterance(message)
        utterance.lang = 'th-TH'
        utterance.rate = 1.08 // จังหวะพูดกระฉับกระเฉง ชัดถ้อยชัดคำ สดใสและเป็นธรรมชาติ
        utterance.pitch = 1.02 // เสียงสดใส ชัดเจน
        utterance.volume = 1.0

        if (!cachedThaiVoice) {
          updateThaiVoiceCache()
        }
        if (cachedThaiVoice) {
          utterance.voice = cachedThaiVoice
        }

        window.speechSynthesis.speak(utterance)
      }
    } catch (err) {
      console.error('Speech synthesis error:', err)
    }
  }, 80)
}

export default function StaffPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null)
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevPendingCountRef = useRef<number | null>(null)

  useEffect(() => {
    // Warm up speech voices & unlock AudioContext on first user interaction
    updateThaiVoiceCache()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateThaiVoiceCache
    }

    const unlockAudio = () => {
      getAudioContext()
      updateThaiVoiceCache()
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
    window.addEventListener('click', unlockAudio, { once: true })
    window.addEventListener('touchstart', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('click', unlockAudio)
      window.removeEventListener('touchstart', unlockAudio)
    }
  }, [])
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
      const currentOrders = orderData || []
      setOrders(currentOrders)

      // Check if new pending orders arrived
      const pendingOrders = currentOrders.filter((o) => o.status === 'pending')
      const pendingCount = pendingOrders.length
      if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current && soundEnabled) {
        const latestOrder = pendingOrders[0]
        playOrderSound(latestOrder?.table_id)
      }
      prevPendingCountRef.current = pendingCount

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

    // Supabase Realtime Subscription for Instant Voice Alert & Updates
    const supabase = createClient()
    const channel = supabase
      .channel('realtime-staff-orders-voice')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as any
          if (soundEnabled) {
            playOrderSound(newOrder?.table_id)
          }
          fetchOrdersAndMenu()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [soundEnabled])

  const updateOrderStatus = async (
    orderId: string,
    nextStatus: Order['status'],
    paymentMethod: 'cash' | 'promptpay' = 'cash'
  ) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)

      if (error) throw error

      if (nextStatus === 'paid') {
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle()

        if (existingPayment) {
          await supabase
            .from('payments')
            .update({
              status: 'paid',
              payment_method: paymentMethod,
            })
            .eq('order_id', orderId)
        } else {
          await supabase.from('payments').insert({
            order_id: orderId,
            status: 'paid',
            payment_method: paymentMethod,
            amount: 0,
          })
        }
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: nextStatus,
                payment_method: paymentMethod,
                payments:
                  o.payments && o.payments.length > 0
                    ? o.payments.map((p) => ({
                        ...p,
                        status: 'paid',
                        payment_method: paymentMethod,
                      }))
                    : [
                        {
                          id: 'temp-' + Date.now(),
                          slip_url: null,
                          status: 'paid',
                          payment_method: paymentMethod,
                        },
                      ],
              }
            : o
        )
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

  // 1. Orders to Do: pending + preparing
  const todoOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing')

  // 2. Completed Orders: served + paid
  const completedOrders = orders.filter((o) => o.status === 'served' || o.status === 'paid')

  const outOfStockCount = menuItems.filter((i) => !i.is_available).length

  return (
    <main className="min-h-dvh bg-background p-4 sm:p-6 pb-24">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">ระบบจัดการออเดอร์ห้องครัว</h1>
            <p className="text-xs text-muted-foreground">รายการออเดอร์ต้องทำ และ รายการที่ทำเสร็จแล้ว</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Voice Notification Toggle & Test */}
          <div className="flex items-center gap-1 rounded-full bg-secondary/80 p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                soundEnabled
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{soundEnabled ? 'เสียงเตือน: เปิด' : 'เสียงเตือน: ปิด'}</span>
            </button>
            <button
              type="button"
              onClick={() => playOrderSound('1')}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
              title="กดทดสอบเสียงพูดแจ้งเตือน"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>ทดสอบ</span>
            </button>
          </div>

          {/* Stock Toggle Modal Trigger */}
          <button
            type="button"
            onClick={() => setStockModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/20"
          >
            <Utensils className="h-3.5 w-3.5" /> เปิด/ปิด สินค้าหมด
            {outOfStockCount > 0 && (
              <span className="rounded-full bg-destructive px-2 py-0.2 text-[10px] font-bold text-destructive-foreground">
                {outOfStockCount}
              </span>
            )}
          </button>

          {/* Link to Admin Page if user is Admin */}
          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-secondary-foreground"
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

      {/* 2-COLUMN SINGLE PAGE LAYOUT */}
      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2">
        {/* COLUMN 1: 🔥 ออเดอร์ที่ต้องทำ (Pending & Preparing) */}
        <section className="flex flex-col rounded-3xl border border-amber-500/30 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-display text-xl font-bold text-card-foreground">🔥 ออเดอร์ที่ต้องทำ</h2>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 font-display text-xs font-bold text-amber-700">
              {todoOrders.length} รายการ
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[75vh]">
            {todoOrders.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-xs">ไม่มีออเดอร์ค้างทำในขณะนี้</p>
              </div>
            ) : (
              todoOrders.map((order) => {
                const isPending = order.status === 'pending'
                const slipUrl = order.payments?.[0]?.slip_url

                return (
                  <div key={order.id} className="rounded-2xl border border-border bg-background p-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-display text-base font-bold text-primary">
                        โต๊ะ {order.table_id} <span className="ml-1 text-xs font-normal text-foreground">(#{order.id.slice(0, 8).toUpperCase()})</span>
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isPending ? 'bg-amber-500/15 text-amber-700' : 'bg-blue-500/15 text-blue-700'}`}>
                        {isPending ? 'รอรับออเดอร์' : 'กำลังปรุงอาหาร'}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      เวลาสั่ง: {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Order Items Breakdown */}
                    <ul className="mt-3 divide-y divide-border/60 text-xs">
                      {order.order_items?.map((item) => (
                        <li key={item.id} className="py-2">
                          <div className="flex justify-between font-semibold text-foreground text-sm">
                            <span>{item.name} × {item.qty}</span>
                            <span>{item.price * item.qty}฿</span>
                          </div>
                          {item.order_item_options && item.order_item_options.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.order_item_options.map((opt) => {
                                const isTakeaway = opt.name.includes('ใส่ถุงกลับบ้าน')
                                const isNote = opt.name.includes('📝')
                                return (
                                  <span
                                    key={opt.id}
                                    className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                      isTakeaway
                                        ? 'bg-amber-500/20 text-amber-800 font-bold border border-amber-500/30'
                                        : isNote
                                        ? 'bg-blue-500/15 text-blue-800 font-bold border border-blue-500/20'
                                        : 'bg-secondary text-secondary-foreground'
                                    }`}
                                  >
                                    {opt.name}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                      <span className="font-semibold text-muted-foreground">ราคารวม:</span>
                      <span className="font-display text-base font-bold text-primary">{order.total} บาท</span>
                    </div>

                    {/* Status Action Button */}
                    <div className="mt-3">
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 font-display text-xs font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer hover:bg-amber-600"
                        >
                          เริ่มทำอาหาร →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'served')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 font-display text-xs font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer hover:bg-emerald-700"
                        >
                          <Check className="h-4 w-4" /> ส่งมอบแล้ว →
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* COLUMN 2: ✅ ทำเสร็จแล้ว (Served & Paid) */}
        <section className="flex flex-col rounded-3xl border border-emerald-500/30 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              <h2 className="font-display text-xl font-bold text-card-foreground">✅ ทำเสร็จแล้ว / ชำระแล้ว</h2>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-display text-xs font-bold text-emerald-700">
              {completedOrders.length} รายการ
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[75vh]">
            {completedOrders.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-xs">ยังไม่มีออเดอร์ที่เสร็จแล้ว</p>
              </div>
            ) : (
              completedOrders.map((order) => {
                const slipUrl = order.payments?.[0]?.slip_url
                const isPaid = order.status === 'paid' || !!slipUrl

                return (
                  <div key={order.id} className="rounded-2xl border border-border bg-background p-4 shadow-xs opacity-90 hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-display text-base font-bold text-primary">
                        โต๊ะ {order.table_id} <span className="ml-1 text-xs font-normal text-foreground">(#{order.id.slice(0, 8).toUpperCase()})</span>
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isPaid ? 'bg-emerald-500/15 text-emerald-700' : 'bg-purple-500/15 text-purple-700'}`}>
                        {isPaid ? 'ชำระแล้ว' : 'เสิร์ฟเรียบร้อย'}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-muted-foreground">
                      เวลาเสร็จ: {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Order Items */}
                    <ul className="mt-2 divide-y divide-border/40 text-xs">
                      {order.order_items?.map((item) => (
                        <li key={item.id} className="py-1">
                          <div className="flex justify-between text-foreground">
                            <span>{item.name} × {item.qty}</span>
                            <span>{item.price * item.qty}฿</span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                      <span className="font-semibold text-muted-foreground">ราคารวม:</span>
                      <span className="font-display text-sm font-bold text-primary">{order.total} บาท</span>
                    </div>

                    {slipUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlip(slipUrl)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-secondary py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" /> ดูสลิปเงินโอน
                      </button>
                    )}

                    {!isPaid ? (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'paid', 'cash')}
                          className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors active:scale-95 cursor-pointer"
                        >
                          <Banknote className="h-4 w-4" /> 💵 รับเงินสด
                        </button>
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'paid', 'promptpay')}
                          className="flex items-center justify-center gap-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-colors active:scale-95 cursor-pointer"
                        >
                          <Smartphone className="h-4 w-4" /> 📱 สแกนโอน
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 text-center text-[11px] font-bold text-emerald-700 bg-emerald-500/10 py-1.5 rounded-xl flex items-center justify-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          ชำระเงินเรียบร้อย (
                          {order.payment_method === 'cash' ||
                          order.payments?.[0]?.payment_method === 'cash' ||
                          order.payments?.[0]?.method === 'cash'
                            ? '💵 เงินสด'
                            : '📱 โอนเงิน'}
                          )
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* STOCK MANAGEMENT POPUP MODAL */}
      {stockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setStockModalOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-xl font-bold text-card-foreground">จัดการเปิด/ปิด เมนูสินค้าหมด</h3>
                <p className="text-xs text-muted-foreground">กดสลับสถานะเพื่อระงับการสั่งสินค้าชั่วคราวหน้าร้าน</p>
              </div>
              <button type="button" onClick={() => setStockModalOpen(false)} className="rounded-full bg-secondary p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${
                    item.is_available ? 'border-border bg-background' : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <div>
                    <h4 className="font-display text-sm font-bold text-card-foreground">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">{item.price} บาท</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleMenuAvailability(item.id, item.is_available)}
                    className={`rounded-full px-3.5 py-1.5 font-display text-xs font-bold shadow-xs transition-transform active:scale-95 ${
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

            <button
              type="button"
              onClick={() => setStockModalOpen(false)}
              className="mt-5 w-full rounded-full bg-primary py-3 font-display text-sm font-bold text-primary-foreground"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* SLIP MODAL VIEW */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setSelectedSlip(null)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10 max-h-[85vh] w-full max-w-sm rounded-3xl bg-card p-4 shadow-2xl">
            <button type="button" onClick={() => setSelectedSlip(null)} className="absolute right-3 top-3 rounded-full bg-secondary p-1.5">
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-3 font-display text-base font-bold text-card-foreground">สลิปการโอนเงิน</h3>
            <img src={selectedSlip} alt="Slip" className="mx-auto max-h-[70vh] rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </main>
  )
}
