'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getStoreSettings, setStoreOpenStatus } from '@/lib/store-settings'
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
  PlusCircle,
  Plus,
  Minus,
  Trash2,
  Store,
  Moon,
  Loader2,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import {
  menuItems as staticMenuItems,
  defaultOptions,
  hasRequiredOptions,
  optionPrice,
  type SelectedOptions,
  type MenuOption,
} from '@/lib/menu'

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
  instructions?: string | null
  options?: OrderItemOption[] | null
  order_item_options?: OrderItemOption[] | null
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
  options?: any
}

type PosCartItem = {
  id: string
  menuItem: MenuItem
  selectedOptions: SelectedOptions
  instructions: string
  unitPrice: number
  qty: number
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
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [posModalOpen, setPosModalOpen] = useState(false)
  const [posTableId, setPosTableId] = useState('1')
  const [posCategory, setPosCategory] = useState('all')
  const [posSearch, setPosSearch] = useState('')
  const [posCart, setPosCart] = useState<PosCartItem[]>([])
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null)
  const [customSelected, setCustomSelected] = useState<SelectedOptions>({})
  const [customInstructions, setCustomInstructions] = useState('')
  const [posSubmitting, setPosSubmitting] = useState(false)
  const prevPendingCountRef = useRef<number | null>(null)

  const handleToggleStoreOpen = async () => {
    const next = !isStoreOpen
    setIsStoreOpen(next)
    await setStoreOpenStatus(next)
  }

  const handlePosItemClick = (item: MenuItem) => {
    if (item.options?.groups && item.options.groups.length > 0) {
      setCustomizingItem(item)
      setCustomSelected(defaultOptions(item as any))
      setCustomInstructions('')
    } else {
      handlePosAddToCart(item, {}, '')
    }
  }

  const handlePosAddToCart = (item: MenuItem, selected: SelectedOptions, instructions: string) => {
    const extra = optionPrice(selected)
    const unitPrice = (Number(item.price) || 0) + extra
    const selectedKey = JSON.stringify(selected) + instructions.trim()

    setPosCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.menuItem.id === item.id && JSON.stringify(c.selectedOptions) + c.instructions.trim() === selectedKey
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [
        ...prev,
        {
          id: `${item.id}-${Date.now()}-${Math.random()}`,
          menuItem: item,
          selectedOptions: selected,
          instructions: instructions.trim(),
          unitPrice,
          qty: 1,
        },
      ]
    })
    setCustomizingItem(null)
  }

  const handlePosRemoveFromCart = (cartItemId: string) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((c) => c.id === cartItemId)
      if (idx < 0) return prev
      if (prev[idx].qty <= 1) {
        return prev.filter((c) => c.id !== cartItemId)
      }
      const next = [...prev]
      next[idx] = { ...next[idx], qty: next[idx].qty - 1 }
      return next
    })
  }

  const handlePosSubmitOrder = async () => {
    if (posCart.length === 0) {
      alert('กรุณาเลือกรายการอาหารก่อนกดสั่งครับ')
      return
    }
    setPosSubmitting(true)
    try {
      const supabase = createClient()
      const total = posCart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0)
      const tableStr = posTableId === 'takeaway' ? 'กลับบ้าน' : `T${posTableId}`

      // 1. Insert order
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          table_id: tableStr,
          status: 'pending',
          total,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // 2. Insert order items with options and instructions
      const orderItems = posCart.map((c) => {
        const optionList = Object.values(c.selectedOptions)
          .flat()
          .filter(Boolean)
          .map((o) => ({
            id: o.id,
            name: o.label,
            extra_price: o.price || 0,
          }))

        return {
          order_id: newOrder.id,
          menu_item_id: c.menuItem.id,
          name: c.menuItem.name,
          price: c.unitPrice,
          qty: c.qty,
          options: optionList.length > 0 ? optionList : null,
          instructions: c.instructions || null,
        }
      })

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      // Announce sound and refresh
      playOrderSound(posTableId === 'takeaway' ? 'กลับบ้าน' : posTableId)
      setPosCart([])
      setPosModalOpen(false)
      fetchOrdersAndMenu()
    } catch (err: any) {
      console.error('POS order error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกออเดอร์')
    } finally {
      setPosSubmitting(false)
    }
  }

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

      // Fetch menu items, option_groups, options
      const { data: menuData } = await supabase.from('menu_items').select('*').order('category_id')
      const { data: dbGroups } = await supabase.from('option_groups').select('*')
      const { data: dbOptions } = await supabase.from('options').select('*')

      const buildOptions = (menuItemId: string, staticOpts?: any) => {
        const rawGroups = dbGroups?.filter((g) => g.menu_item_id === menuItemId) || []
        const itemGroups = rawGroups.filter((grp, idx, self) => self.findIndex((t) => t.name === grp.name) === idx)
        if (itemGroups.length === 0) return staticOpts

        return {
          groups: itemGroups.map((g) => ({
            id: g.id,
            label: g.name,
            required: g.is_required,
            options: (dbOptions?.filter((o) => o.group_id === g.id) || []).map((o) => ({
              id: o.id,
              label: o.name,
              price: Number(o.extra_price) || 0,
            })),
          })),
        }
      }

      if (menuData && menuData.length > 0) {
        const dynamicItems = menuData.map((d) => {
          const staticMatch = staticMenuItems.find((m) => m.id === d.id)
          return {
            ...d,
            options: buildOptions(d.id, staticMatch?.options),
          }
        })
        setMenuItems(dynamicItems)
      } else {
        setMenuItems(staticMenuItems as any)
      }
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
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
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{soundEnabled ? 'เสียง: เปิด' : 'เสียง: ปิด'}</span>
            </button>
            <button
              type="button"
              onClick={() => playOrderSound('1')}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-xs font-bold text-secondary-foreground border border-border hover:bg-secondary/80 cursor-pointer"
          >
            <Utensils className="h-3.5 w-3.5 text-primary" />
            <span>สินค้าหมด</span>
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
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
              title="ไปหน้า Admin"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">หน้า Admin</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchOrdersAndMenu}
            className="flex items-center justify-center rounded-full bg-secondary h-8 w-8 text-secondary-foreground hover:bg-secondary/80 transition-transform active:scale-95 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center rounded-full bg-destructive/10 h-8 w-8 text-destructive hover:bg-destructive/20 cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 🚀 QUICK ACTION HERO BAR (POS & STORE TOGGLE) */}
      <div className="mx-auto mt-4 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* POS Quick Order Button */}
          <button
            type="button"
            onClick={() => setPosModalOpen(true)}
            className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 p-4 text-white shadow-md shadow-amber-500/20 hover:opacity-95 transition-transform active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-display text-base font-bold">➕ รับออเดอร์หน้าร้าน (POS)</h3>
                <p className="text-xs text-amber-100/90">สำหรับลูกค้าสั่งกับแม่ค้า / สแกนไม่เป็น / สั่งกลับบ้าน</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/80 shrink-0" />
          </button>

          {/* Store Open/Closed Master Switch Banner */}
          <button
            type="button"
            onClick={handleToggleStoreOpen}
            className={`flex items-center justify-between gap-3 rounded-2xl p-4 transition-all shadow-xs cursor-pointer border ${
              isStoreOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 hover:bg-emerald-500/20'
                : 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isStoreOpen ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'
                }`}
              >
                {isStoreOpen ? <Store className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold">
                    {isStoreOpen ? '🟢 ร้านเปิดรับออเดอร์' : '🔴 ร้านปิดรับออเดอร์'}
                  </h3>
                  <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold border border-border">
                    กดเพื่อสลับ
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isStoreOpen
                    ? 'ลูกค้าสามารถสแกน QR สั่งอาหารได้ตามปกติ'
                    : 'ล็อกการสั่งทั้งหมดเพื่อป้องกันการกดสั่งแกล้ง'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

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
                          {(() => {
                            const allOpts = (item.order_item_options && item.order_item_options.length > 0)
                              ? item.order_item_options
                              : (item.options && item.options.length > 0)
                              ? item.options
                              : []

                            return (
                              <>
                                {allOpts.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {allOpts.map((opt) => {
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
                                {item.instructions && (
                                  <div className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                    💬 {item.instructions}
                                  </div>
                                )}
                              </>
                            )
                          })()}
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

      {/* 🛍️ POS QUICK ORDER MODAL FOR WALK-IN / PHONE-IN CUSTOMERS */}
      {posModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setPosModalOpen(false)}
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          />
          <div className="relative z-10 flex flex-col max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-2xl border border-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-card-foreground">รับออเดอร์หน้าร้าน (POS Mode)</h3>
                  <p className="text-[11px] text-muted-foreground">สำหรับลูกค้าที่สั่งกับแม่ค้าโดยตรง หรือ สั่งกลับบ้าน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Select Table / Takeaway */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">📍 เลือกโต๊ะ หรือ สั่งกลับบ้าน:</label>
                <div className="flex flex-wrap gap-1.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPosTableId(t)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        posTableId === t
                          ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      โต๊ะ {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPosTableId('takeaway')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      posTableId === 'takeaway'
                        ? 'bg-amber-500 text-white shadow-xs scale-105'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    🛍️ ใส่ถุงกลับบ้าน
                  </button>
                </div>
              </div>

              {/* Search & Category Filter Section */}
              <div className="space-y-2 pt-1 border-t border-border">
                {/* Instant Search Bar */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="🔍 ค้นหาเมนู เช่น เนื้อ, ต้มยำ, ข้าวมันไก่, ชาเย็น..."
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-9 pr-8 text-xs font-semibold placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                  />
                  {posSearch && (
                    <button
                      type="button"
                      onClick={() => setPosSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Quick Filter Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {[
                    { id: 'all', name: '✨ ทั้งหมด' },
                    { id: 'noodles', name: '🍜 ก๋วยเตี๋ยว' },
                    { id: 'khaomangai', name: '🍚 ข้าวมันไก่' },
                    { id: 'drinks', name: '🥤 เครื่องดื่ม' },
                  ].map((cat) => {
                    const isActive = posCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPosCategory(cat.id)}
                        className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-xs scale-102'
                            : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Menu List */}
              <div>
                {(() => {
                  const categoryOrder: Record<string, number> = {
                    noodles: 1,
                    khaomangai: 2,
                    drinks: 3,
                  }

                  const filteredItems = menuItems
                    .filter((m) => m.is_available)
                    .filter((m) => posCategory === 'all' || m.category_id === posCategory)
                    .filter((m) => !posSearch.trim() || m.name.toLowerCase().includes(posSearch.trim().toLowerCase()))
                    .sort((a, b) => {
                      const orderA = categoryOrder[a.category_id] ?? 99
                      const orderB = categoryOrder[b.category_id] ?? 99
                      if (orderA !== orderB) return orderA - orderB
                      return a.name.localeCompare(b.name, 'th')
                    })

                  return (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-muted-foreground block">
                          🍜 แตะเลือกเมนู ({filteredItems.length} รายการ):
                        </label>
                        {posSearch && (
                          <span className="text-[11px] text-primary font-medium">ผลการค้นหา "{posSearch}"</span>
                        )}
                      </div>

                      {filteredItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-8 text-center text-muted-foreground">
                          <p className="text-xs">ไม่พบเมนูที่ตรงกับคำค้นหา</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPosSearch('')
                              setPosCategory('all')
                            }}
                            className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            ดูเมนูทั้งหมด
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredItems.map((item) => {
                            const inCartCount = posCart
                              .filter((c) => c.menuItem.id === item.id)
                              .reduce((sum, c) => sum + c.qty, 0)
                            const hasOpts = item.options?.groups && item.options.groups.length > 0

                            return (
                              <div
                                key={item.id}
                                onClick={() => handlePosItemClick(item)}
                                className={`flex items-center justify-between rounded-2xl border p-2.5 transition-all cursor-pointer active:scale-98 ${
                                  inCartCount > 0
                                    ? 'border-primary/50 bg-primary/5 shadow-xs'
                                    : 'border-border bg-card hover:bg-secondary/40'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                                  ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                                      <Utensils className="h-5 w-5" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-card-foreground">{item.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <p className="text-xs font-bold text-primary">{item.price} บาท</p>
                                      {hasOpts && (
                                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                                          <SlidersHorizontal className="h-2.5 w-2.5" /> เลือกเส้น/ขนาด
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {inCartCount > 0 ? (
                                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground shadow-xs">
                                      ×{inCartCount}
                                    </span>
                                  ) : (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground">
                                      <Plus className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Live Cart in Modal */}
              {posCart.length > 0 && (
                <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-card-foreground border-b border-border pb-1.5">
                    <span>📋 รายการที่เลือก ({posCart.reduce((sum, c) => sum + c.qty, 0)} รายการ)</span>
                    <button
                      type="button"
                      onClick={() => setPosCart([])}
                      className="text-muted-foreground hover:text-destructive text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> ล้างทั้งหมด
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {posCart.map((c) => {
                      const optionBadges = Object.values(c.selectedOptions)
                        .flat()
                        .filter(Boolean)
                        .map((o) => o.label)

                      return (
                        <div key={c.id} className="flex items-start justify-between text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-card-foreground">
                              {c.menuItem.name} <span className="text-primary font-bold">× {c.qty}</span>
                            </p>
                            {optionBadges.length > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                ↳ {optionBadges.join(', ')}
                              </p>
                            )}
                            {c.instructions && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                💬 โน้ต: {c.instructions}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-primary">{c.unitPrice * c.qty}฿</span>
                            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handlePosRemoveFromCart(c.id)}
                                className="h-5 w-5 flex items-center justify-center rounded bg-card text-card-foreground cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-[11px] font-bold px-1">{c.qty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPosCart((prev) =>
                                    prev.map((item) => (item.id === c.id ? { ...item, qty: item.qty + 1 } : item))
                                  )
                                }}
                                className="h-5 w-5 flex items-center justify-center rounded bg-primary text-primary-foreground cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border p-4 bg-muted/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">ยอดรวมทั้งหมด</p>
                <p className="font-display text-xl font-bold text-primary">
                  {posCart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0)} บาท
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPosModalOpen(false)}
                  className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={posCart.length === 0 || posSubmitting}
                  onClick={handlePosSubmitOrder}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {posSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> 🚀 ส่งเข้าห้องครัวทันที
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🍜 POPUP CUSTOMIZATION MODAL FOR POS DISH OPTIONS */}
      {customizingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-foreground/60 backdrop-blur-sm">
          <div className="relative z-10 flex flex-col max-h-[85vh] w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl border border-border">
            {/* Customizer Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
              <div className="flex items-center gap-2.5">
                {customizingItem.image_url ? (
                  <img src={customizingItem.image_url} alt={customizingItem.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Utensils className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-display text-base font-bold text-card-foreground">{customizingItem.name}</h3>
                  <p className="text-xs text-primary font-bold">{customizingItem.price} บาท (เริ่มต้น)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="rounded-full bg-secondary p-1.5 text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Customizer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {customizingItem.options?.groups?.map((group: any) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-card-foreground">
                      {group.label}
                      {group.required && <span className="ml-1 text-[11px] font-bold text-destructive">*</span>}
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {group.required ? '(จำเป็นต้องเลือก)' : '(เลือกได้)'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((option: any) => {
                      const isSelected = customSelected[group.id]?.some((o) => o.id === option.id)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setCustomSelected((prev) => ({
                              ...prev,
                              [group.id]: [option],
                            }))
                          }}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs scale-102'
                              : 'bg-secondary/70 text-card-foreground border-border hover:bg-secondary'
                          }`}
                        >
                          <span>{option.label}</span>
                          {option.price > 0 && (
                            <span className={`ml-1 text-[10px] font-bold ${isSelected ? 'text-primary-foreground/90' : 'text-primary'}`}>
                              +{option.price}฿
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Note / Special Instructions */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-card-foreground block">
                  📝 รายละเอียดเพิ่มเติม / โน้ต:
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="เช่น ไม่ใส่ผัก, ไม่ถั่วงอก, น้ำใส..."
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Customizer Footer */}
            <div className="border-t border-border p-4 bg-muted/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">ราคารวมรายการนี้</p>
                <p className="font-display text-lg font-bold text-primary">
                  {(Number(customizingItem.price) || 0) + optionPrice(customSelected)} บาท
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizingItem(null)}
                  className="rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!hasRequiredOptions(customizingItem as any, customSelected)}
                  onClick={() => handlePosAddToCart(customizingItem, customSelected, customInstructions)}
                  className="flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> เพิ่มลงบิล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
