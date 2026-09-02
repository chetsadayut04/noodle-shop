'use client'

import { useMemo, useState, useEffect } from 'react'
import { categories, menuItems, type MenuItem, type SelectedOptions, optionPrice, optionsKey } from '@/lib/menu'
import { MenuCard } from '@/components/menu-card'
import { FloatingCart } from '@/components/floating-cart'
import { OrderSummary } from '@/components/order-summary'
import { createClient } from '@/utils/supabase/client'
import { createOrderOnly } from '@/lib/payment'
import { Receipt, UtensilsCrossed, Shield, UserCheck, CheckCircle2, Loader2 } from 'lucide-react'

type CartEntry = { item: MenuItem; selected: SelectedOptions; quantity: number }

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
  const [submittingOrder, setSubmittingOrder] = useState(false)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const supabase = createClient()

    // Fetch user role
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserRole(data.user.user_metadata?.role || 'staff')
      }
    })

    // Fetch live menu items availability
    async function fetchAvailability() {
      try {
        const { data } = await supabase.from('menu_items').select('id, is_available')
        if (data) {
          const map: Record<string, boolean> = {}
          data.forEach((item) => {
            map[item.id] = item.is_available
          })
          setAvailabilityMap(map)
        }
      } catch (err) {
        console.error('Fetch availability error:', err)
      }
    }

    fetchAvailability()
  }, [])

  const addItem = (item: MenuItem, selected: SelectedOptions) => {
    const key = `${item.id}-${optionsKey(selected)}`
    setCart((prev) => ({ ...prev, [key]: { item, selected, quantity: (prev[key]?.quantity ?? 0) + 1 } }))
  }

  const removeItem = (entry: CartEntry) => setCart((prev) => {
    const key = Object.keys(prev).find((k) => prev[k].item.id === entry.item.id && optionsKey(prev[k].selected) === optionsKey(entry.selected))
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

  const visibleItems = menuItems.filter((item) => item.category === activeCategory)
  
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

  const activeSummaryLines = lines.length > 0 ? lines : orderedHistory
  const activeSummaryPrice = lines.length > 0 ? totalPrice : orderedHistoryPrice

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl pb-28">
      <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-accent-foreground">ครัวริมคลอง</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              <UtensilsCrossed className="h-3 w-3" /> โต๊ะ {tableId}
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground text-balance">ก๋วยเตี๋ยว &amp; ข้าวมันไก่</h1>
          <p className="mt-2 text-pretty text-muted-foreground">รสชาติต้นตำรับ เส้นเหนียวนุ่ม น้ำซุปเข้มข้น พร้อมเสิร์ฟความอร่อยถึงโต๊ะคุณ</p>
        </div>

        <div className="flex items-center gap-2">
          {userRole && (
            <div className="flex flex-col gap-1 sm:flex-row">
              {userRole === 'admin' && (
                <a
                  href="/admin"
                  className="inline-flex items-center gap-1 rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20"
                >
                  <Shield className="h-3.5 w-3.5" /> Admin
                </a>
              )}
              <a
                href="/staff"
                className="inline-flex items-center gap-1 rounded-2xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80"
              >
                <UserCheck className="h-3.5 w-3.5" /> Staff
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            aria-label="ดูสรุปรายการอาหารและค่าใช้จ่าย"
            className="mt-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-border transition-transform active:scale-95"
          >
            <Receipt className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav aria-label="หมวดหมู่เมนู" className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <ul className="flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                aria-pressed={cat.id === activeCategory}
                className={`whitespace-nowrap rounded-full px-5 py-2 font-display text-base font-semibold ${cat.id === activeCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
              >
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className="grid grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-2">
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

      {/* Order Summary & Receipt Modal (Contains PromptPay QR Code Payment Option) */}
      {summaryOpen && (
        <OrderSummary
          lines={activeSummaryLines}
          totalPrice={activeSummaryPrice}
          tableId={tableId}
          lastOrderId={lastOrderId}
          onClose={() => setSummaryOpen(false)}
        />
      )}

      {/* Order Success Confirmation Popup */}
      {orderSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setOrderSuccessOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 animate-bounce" />
            <h2 className="mt-3 font-display text-2xl font-bold text-card-foreground">สั่งอาหารเรียบร้อยแล้ว!</h2>
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
