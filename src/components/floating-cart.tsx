'use client'

import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { optionPrice, optionSummary, optionsKey, type MenuItem, type SelectedOptions } from '@/lib/menu'

export type CartLine = { item: MenuItem; selected: SelectedOptions; instructions?: string; quantity: number }

type FloatingCartProps = {
  lines: CartLine[]
  totalCount: number
  totalPrice: number
  isStoreOpen?: boolean
  onAdd: (item: MenuItem, selected: SelectedOptions, instructions?: string) => void
  onRemove: (line: CartLine) => void
  onClear: () => void
  onCheckout: () => void
}

export function FloatingCart({ lines, totalCount, totalPrice, isStoreOpen = true, onAdd, onRemove, onClear, onCheckout }: FloatingCartProps) {
  const [open, setOpen] = useState(false)
  if (totalCount === 0) return null

  return <>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="ปิดตะกร้า" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[86vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-bold text-card-foreground">ตะกร้าของคุณ</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80" aria-label="ปิด"><X className="h-5 w-5" /></button>
        </div>
        <ul className="max-h-[48vh] divide-y divide-border overflow-y-auto px-5">{lines.map((line) => <li key={`${line.item.id}-${optionsKey(line.selected, line.instructions)}`} className="flex items-center gap-3 py-3"><img src={line.item.image} alt={line.item.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-border/60" /><div className="min-w-0 flex-1"><p className="truncate font-bold text-card-foreground">{line.item.name}</p>{optionSummary(line.selected, line.instructions) && <p className="line-clamp-2 text-xs text-muted-foreground">{optionSummary(line.selected, line.instructions)}</p>}<p className="text-sm font-bold text-primary">{line.item.price + optionPrice(line.selected)} บาท</p></div><div className="flex items-center gap-2 rounded-full bg-secondary/80 border border-border/60 p-1"><button type="button" onClick={() => onRemove(line)} className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-secondary-foreground shadow-xs" aria-label={`ลด ${line.item.name}`}><Minus className="h-3.5 w-3.5" /></button><span className="min-w-4 text-center font-display text-xs font-bold text-secondary-foreground">{line.quantity}</span><button type="button" onClick={() => onAdd(line.item, line.selected, line.instructions)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs" aria-label={`เพิ่ม ${line.item.name}`}><Plus className="h-3.5 w-3.5" /></button></div></li>)}</ul>
        <div className="space-y-3 border-t border-border px-5 py-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">ยอดรวมทั้งหมด</span><span className="font-display text-2xl font-bold text-primary">{totalPrice} บาท</span></div><div className="flex gap-2"><button type="button" onClick={onClear} className="flex items-center justify-center gap-1.5 rounded-full bg-secondary border border-border px-4 py-3 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors"><Trash2 className="h-4 w-4" />ล้าง</button>{isStoreOpen ? (<button type="button" onClick={() => { setOpen(false); onCheckout() }} className="flex-1 rounded-full bg-primary py-3 font-display font-bold text-sm text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95">สั่งอาหาร</button>) : (<button type="button" disabled className="flex-1 rounded-full bg-muted py-3 font-display font-bold text-xs text-muted-foreground cursor-not-allowed">🔴 ขณะนี้ร้านปิดรับออเดอร์</button>)}</div></div>
      </div>
    </div>}
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"><button type="button" onClick={() => setOpen(true)} className={`mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full ${isStoreOpen ? 'bg-gradient-to-r from-primary via-primary to-amber-900 shadow-xl shadow-primary/30' : 'bg-muted-foreground/80'} px-3.5 py-2.5 text-primary-foreground border border-white/15 transition-transform active:scale-[0.98]`}><span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/20"><ShoppingBag className="h-5 w-5" /><span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950 shadow-xs">{totalCount}</span></span><span className="font-display text-base font-bold">{isStoreOpen ? 'ดูรายการในตะกร้า' : 'ร้านปิดรับออเดอร์ชั่วคราว'}</span><span className="font-display text-lg font-bold">{totalPrice} บาท</span></button></div>
  </>
}
