'use client'

import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { optionPrice, optionSummary, optionsKey, type MenuItem, type SelectedOptions } from '@/lib/menu'

export type CartLine = { item: MenuItem; selected: SelectedOptions; quantity: number }

type FloatingCartProps = {
  lines: CartLine[]
  totalCount: number
  totalPrice: number
  onAdd: (item: MenuItem, selected: SelectedOptions) => void
  onRemove: (line: CartLine) => void
  onClear: () => void
}

export function FloatingCart({ lines, totalCount, totalPrice, onAdd, onRemove, onClear }: FloatingCartProps) {
  const [open, setOpen] = useState(false)
  if (totalCount === 0) return null

  return <>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="ปิดตะกร้า" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[86vh] w-full max-w-md overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-bold text-card-foreground">ตะกร้าของคุณ</h2>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-secondary p-2" aria-label="ปิด"><X className="h-5 w-5" /></button>
        </div>
        <ul className="max-h-[48vh] divide-y divide-border overflow-y-auto px-5">{lines.map((line) => <li key={`${line.item.id}-${optionsKey(line.selected)}`} className="flex items-center gap-3 py-3"><img src={line.item.image} alt={line.item.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-medium text-card-foreground">{line.item.name}</p>{optionSummary(line.selected) && <p className="line-clamp-2 text-xs text-muted-foreground">{optionSummary(line.selected)}</p>}<p className="text-sm text-primary">{line.item.price + optionPrice(line.selected)} บาท</p></div><div className="flex items-center gap-2 rounded-full bg-secondary p-1"><button type="button" onClick={() => onRemove(line)} className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-secondary-foreground" aria-label={`ลด ${line.item.name}`}><Minus className="h-3.5 w-3.5" /></button><span className="min-w-4 text-center font-display font-bold text-secondary-foreground">{line.quantity}</span><button type="button" onClick={() => onAdd(line.item, line.selected)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={`เพิ่ม ${line.item.name}`}><Plus className="h-3.5 w-3.5" /></button></div></li>)}</ul>
        <div className="space-y-3 border-t border-border px-5 py-4"><div className="flex items-center justify-between"><span className="text-muted-foreground">รวมทั้งหมด</span><span className="font-display text-2xl font-bold text-primary">{totalPrice} บาท</span></div><div className="flex gap-2"><button type="button" onClick={onClear} className="flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"><Trash2 className="h-4 w-4" />ล้าง</button><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-primary py-3 font-display font-semibold text-primary-foreground">สั่งอาหาร</button></div></div>
      </div>
    </div>}
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"><button type="button" onClick={() => setOpen(true)} className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-primary px-3 py-2.5 text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"><span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/15"><ShoppingBag className="h-5 w-5" /><span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">{totalCount}</span></span><span className="font-display text-base font-semibold">ดูตะกร้า</span><span className="font-display text-lg font-bold">{totalPrice} บาท</span></button></div>
  </>
}

