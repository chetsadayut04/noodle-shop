'use client'

import { useMemo, useState, useEffect } from 'react'
import { categories, menuItems as staticMenuItems, type MenuItem, type SelectedOptions, optionPrice, optionsKey } from '@/lib/menu'
import { MenuCard } from '@/components/menu-card'
import { FloatingCart } from '@/components/floating-cart'
import { OrderSummary } from '@/components/order-summary'
import { createClient } from '@/utils/supabase/client'
import { createOrderOnly } from '@/lib/payment'
import { Receipt, UtensilsCrossed, Shield, UserCheck, CheckCircle2, Loader2 } from 'lucide-react'

type CartEntry = { item: MenuItem; selected: SelectedOptions; instructions?: string; packaging?: 'dine-in' | 'takeaway'; quantity: number }

type MenuPageProps = {
  tableId?: string
}

export function MenuPage({ tableId = 'T1' }: MenuPageProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [orderedHistory, setOrderedHistory] = useState<CartEntry[]>([])
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [orderSuccessOpen, setOrderSuccessOpen] = useState(false)
  const [billPaidSuccessOpen, setBillPaidSuccessOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({})
  const [dbMenuItems, setDbMenuItems] = useState<MenuItem[]>(staticMenuItems)

  const resetBill = (showCelebration = true) => {
    setCart({})
    setOrderedHistory([])
    setLastOrderId(null)
    setSummaryOpen(false)
    setOrderSuccessOpen(false)
    if (showCelebration) {
      setBillPaidSuccessOpen(true)
    }
  }

  // 1. Real-time listener: When staff marks order as PAID, automatically reset customer's bill & cart
  useEffect(() => {
    const supabase = createClient()
    const normTable = String(tableId || '').trim().toUpperCase().replace(/^T/, '')
    const channel = supabase
      .channel(`realtime-customer-table-${tableId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updated = payload.new as any
          if (!updated) return
          const updatedTable = String(updated.table_id || '').trim().toUpperCase().replace(/^T/, '')
          const isOurTable = updatedTable === normTable || updated.table_id === tableId || (lastOrderId && updated.id === lastOrderId)
          if (isOurTable && updated.status === 'paid') {
            resetBill(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableId, lastOrderId])

  // 2. Polling Fallback (Every 3 seconds): Check if active order was marked 'paid'
  useEffect(() => {
    if (!lastOrderId && orderedHistory.length === 0) return

    const checkPaidStatus = async () => {
      try {
        const supabase = createClient()
        if (lastOrderId) {
          const { data } = await supabase
            .from('orders')
            .select('status')
            .eq('id', lastOrderId)
            .single()
          if (data && data.status === 'paid') {
            resetBill(true)
          }
        } else if (orderedHistory.length > 0) {
          const { data } = await supabase
            .from('orders')
            .select('status')
            .eq('table_id', tableId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (data && data.status === 'paid') {
            resetBill(true)
          }
        }
      } catch {
        // ignore background poll errors
      }
    }

    const timer = setInterval(checkPaidStatus, 3000)
    return () => clearInterval(timer)
  }, [lastOrderId, orderedHistory.length, tableId])

  useEffect(() => {
    const supabase = createClient()

    // Fetch user role
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserRole(data.user.user_metadata?.role || 'staff')
      }
    })

    // Fetch live menu items, option_groups, and options from Supabase
    async function fetchMenuItemsAndOptions() {
      try {
        const { data: items } = await supabase.from('menu_items').select('*')
        const { data: dbGroups } = await supabase.from('option_groups').select('*')
        const { data: dbOptions } = await supabase.from('options').select('*')

        if (items) {
          const map: Record<string, boolean> = {}
          items.forEach((item) => {
            map[item.id] = item.is_available
          })
          setAvailabilityMap(map)

          // Helper to attach dynamic options from Supabase DB
          const buildOptions = (menuItemId: string, staticOpts?: any) => {
            const itemGroups = dbGroups?.filter((g) => g.menu_item_id === menuItemId) || []
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

          // Filter out deleted items from static list based on Supabase DB
          const liveIds = new Set(items.map((d) => d.id))
          const filteredStatic = staticMenuItems
            .filter((m) => liveIds.has(m.id))
            .map((m) => ({
              ...m,
              options: buildOptions(m.id, m.options),
            }))

          // Add newly added DB items not in static file
          const newDbItems: MenuItem[] = items
            .filter((d) => !staticMenuItems.some((m) => m.id === d.id))
            .map((d) => ({
              id: d.id,
              name: d.name,
              category: d.category_id as any,
              price: Number(d.price),
              description: 'เมนูอร่อยจากทางร้าน',
              image: '/food/ba-mee.png',
              options: buildOptions(d.id),
            }))

          setDbMenuItems([...filteredStatic, ...newDbItems])
        }
      } catch (err) {
        console.error('Fetch menu items & options error:', err)
      }
    }

    fetchMenuItemsAndOptions()
  }, [])

  const addItem = (item: MenuItem, selected: SelectedOptions, instructions?: string, packaging?: 'dine-in' | 'takeaway') => {
    const key = `${item.id}-${optionsKey(selected, instructions, packaging)}`
    setCart((prev) => ({
      ...prev,
      [key]: { item, selected, instructions, packaging, quantity: (prev[key]?.quantity ?? 0) + 1 },
    }))
  }

  const removeItem = (entry: CartEntry) =>
    setCart((prev) => {
      const key = Object.keys(prev).find(
        (k) =>
          prev[k].item.id === entry.item.id &&
          optionsKey(prev[k].selected, prev[k].instructions, prev[k].packaging) ===
            optionsKey(entry.selected, entry.instructions, entry.packaging)
      )
      if (!key) return prev
      const next = { ...prev }
      if (next[key].quantity <= 1) delete next[key]
      else next[key] = { ...next[key], quantity: next[key].quantity - 1 }
      return next
    })

  const removeItemByMenu = (item: MenuItem) => {
    const entry = Object.values(cart).find((line) => line.item.id === item.id)
    if (entry) removeItem(entry)
  }

  const visibleItems = dbMenuItems.filter((item) => item.category === activeCategory)
  
  const { lines, totalCount, totalPrice } = useMemo(() => {
    const lines = Object.values(cart)
    return {
      lines,
      totalCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      totalPrice: lines.reduce((sum, line) => sum + line.quantity * (line.item.price + optionPrice(line.selected)), 0),
    }
  }, [cart])

  // Total price of past ordered history
  const orderedHistoryPrice = useMemo(() => {
    return orderedHistory.reduce((sum, line) => sum + line.quantity * (line.item.price + optionPrice(line.selected)), 0)
  }, [orderedHistory])

  // Handle direct order submission (NO immediate QR code)
  const handlePlaceOrder = async () => {
    if (lines.length === 0) return
    setSubmittingOrder(true)
    try {
      const order = await createOrderOnly({
        tableId,
        total: totalPrice,
        lines,
      })

      setLastOrderId(order.id)
      setOrderedHistory((prev) => [...prev, ...lines])
      setCart({})
      setOrderSuccessOpen(true)
    } catch (err: any) {
      console.error('Place order error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการส่งคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmittingOrder(false)
    }
  }

  const handlePaymentSuccess = () => {
    setCart({})
    setOrderedHistory([])
    setLastOrderId(null)
  }

  const activeSummaryLines = lines.length > 0 ? lines : orderedHistory
  const activeSummaryPrice = lines.length > 0 ? totalPrice : orderedHistoryPrice

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 sm:px-6 lg:px-8 pb-28">
      <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/25 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-3 py-0.5 text-xs font-bold text-amber-900 shadow-xs">
              🍜 ร้านแม่แต๋
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shadow-xs">
              <UtensilsCrossed className="h-3 w-3" /> โต๊ะ {tableId}
            </span>
          </div>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-foreground text-balance">
            ก๋วยเตี๋ยว &amp; ข้าว
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-pretty text-muted-foreground leading-relaxed">
            รสชาติต้นตำรับ เส้นเหนียวนุ่ม น้ำซุปหอมเข้มข้น พร้อมเสิร์ฟความอร่อยถึงโต๊ะคุณ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userRole && (
            <div className="flex flex-col gap-1 sm:flex-row">
              {userRole === 'admin' && (
                <a
                  href="/admin"
                  className="inline-flex items-center gap-1 rounded-2xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin
                </a>
              )}
              <a
                href="/staff"
                className="inline-flex items-center gap-1 rounded-2xl bg-secondary border border-border px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" /> Staff
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            aria-label="ดูสรุปรายการอาหารและค่าใช้จ่าย"
            className="mt-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm border border-border hover:border-primary/40 transition-all active:scale-95"
          >
            <Receipt className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav aria-label="หมวดหมู่เมนู" className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <ul className="flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => {
            const isActive = cat.id === activeCategory
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={isActive}
                  className={`whitespace-nowrap rounded-full px-5 py-2 font-display text-sm sm:text-base font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'bg-secondary/70 text-secondary-foreground border border-border/60 hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 py-6">
        {visibleItems.map((item) => (
          <MenuCard
            key={item.id}
            item={item}
            quantity={Object.values(cart).filter((x) => x.item.id === item.id).reduce((n, x) => n + x.quantity, 0)}
            isAvailable={availabilityMap[item.id] ?? true}
            onAdd={addItem}
            onRemove={removeItemByMenu}
          />
        ))}
      </section>

      <FloatingCart
        lines={lines}
        totalCount={totalCount}
        totalPrice={totalPrice}
        onAdd={addItem}
        onRemove={removeItem}
        onClear={() => setCart({})}
        onCheckout={handlePlaceOrder}
      />

      {/* Order Summary & Receipt Modal */}
      {summaryOpen && (
        <OrderSummary
          lines={activeSummaryLines}
          totalPrice={activeSummaryPrice}
          tableId={tableId}
          lastOrderId={lastOrderId}
          onClose={() => setSummaryOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Order Success Confirmation Popup */}
      {orderSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setOrderSuccessOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 animate-bounce" />
            <h2 className="mt-3 font-display text-2xl font-bold text-card-foreground">สั่งอาหารเรียบร้อยแล้ว!</h2>
            {lastOrderId && (
              <p className="mt-1 font-display text-sm font-bold text-primary">
                หมายเลขออเดอร์: #{lastOrderId.slice(0, 8).toUpperCase()}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              รายการอาหารของคุณส่งตรงไปยังห้องครัวแล้ว (โต๊ะ {tableId}) กรุณารอเสิร์ฟสักครู่
            </p>
            <p className="mt-3 text-[11px] font-semibold text-primary">
              *คุณสามารถดูสรุปรายการ และสแกน QR Code ชำระเงินได้ที่ปุ่มรูปใบเสร็จ 🧾 มุมบนขวา
            </p>
            <button
              type="button"
              onClick={() => setOrderSuccessOpen(false)}
              className="mt-5 w-full rounded-full bg-primary py-3 font-display text-sm font-bold text-primary-foreground shadow-sm"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Bill Paid Realtime Success Modal (When staff marks paid) */}
      {billPaidSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setBillPaidSuccessOpen(false)} className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl border border-border">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-card-foreground">ชำระเงินเรียบร้อยแล้ว!</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              แม่ค้าได้รับการชำระเงินและปิดบิลเรียบร้อยแล้วครับ<br />
              ขอบคุณที่มาอุดหนุน <span className="font-bold text-primary">ร้านแม่แต๋</span> ครับ 🙏🍜✨
            </p>
            <button
              type="button"
              onClick={() => setBillPaidSuccessOpen(false)}
              className="mt-6 w-full rounded-full bg-primary py-3 font-display text-sm font-bold text-primary-foreground shadow-md transition-transform active:scale-95"
            >
              ตกลง / สั่งอาหารใหม่
            </button>
          </div>
        </div>
      )}

      {/* Order Loading Spinner Overlay */}
      {submittingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-card px-6 py-4 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="font-display text-sm font-bold text-card-foreground">กำลังส่งออเดอร์ไปที่ห้องครัว...</span>
          </div>
        </div>
      )}
    </main>
  )
}
