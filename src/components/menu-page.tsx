'use client'

import { useMemo, useState } from 'react'
import { categories, menuItems, type MenuItem, type SelectedOptions, optionPrice, optionsKey } from '@/lib/menu'
import { MenuCard } from '@/components/menu-card'
import { FloatingCart } from '@/components/floating-cart'
import { OrderSummary } from '@/components/order-summary'
import { PromptPayModal } from '@/components/promptpay-modal'
import { Receipt } from 'lucide-react'

type CartEntry = { item: MenuItem; selected: SelectedOptions; quantity: number }

export function MenuPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

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

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl pb-28">
      <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-8">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-accent-foreground">ครัวริมคลอง</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-foreground text-balance">ก๋วยเตี๋ยว &amp; ข้าวมันไก่</h1>
          <p className="mt-2 text-pretty text-muted-foreground">รสชาติต้นตำรับ เส้นเหนียวนุ่ม น้ำซุปเข้มข้น พร้อมเสิร์ฟความอร่อยถึงโต๊ะคุณ</p>
        </div>
        <button
          type="button"
          onClick={() => setSummaryOpen(true)}
          aria-label="ดูสรุปรายการอาหารและค่าใช้จ่าย"
          className="mt-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-border transition-transform active:scale-95"
        >
          <Receipt className="h-5 w-5" />
        </button>
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
        onCheckout={() => setCheckoutOpen(true)}
      />

      {summaryOpen && (
        <OrderSummary lines={lines} totalPrice={totalPrice} onClose={() => setSummaryOpen(false)} />
      )}

      {checkoutOpen && (
        <PromptPayModal
          totalPrice={totalPrice}
          tableId="T1"
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCart({})
            setCheckoutOpen(false)
          }}
        />
      )}
    </main>
  )
}
