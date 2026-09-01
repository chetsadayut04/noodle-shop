'use client'

import { Receipt, X } from 'lucide-react'
import { optionPrice, optionSummary, optionsKey, type MenuItem, type SelectedOptions } from '@/lib/menu'

export type SummaryLine = { item: MenuItem; selected: SelectedOptions; quantity: number }

type OrderSummaryProps = {
  lines: SummaryLine[]
  totalPrice: number
  onClose: () => void
}

export function OrderSummary({ lines, totalPrice, onClose }: OrderSummaryProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="ปิดสรุปรายการ" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <section aria-labelledby="summary-title" className="relative z-10 max-h-[82vh] w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/40 text-accent-foreground"><Receipt className="h-5 w-5" /></span>
            <div><h2 id="summary-title" className="font-display text-xl font-bold text-card-foreground">สรุปรายการอาหาร</h2><p className="text-xs text-muted-foreground">ตรวจสอบเมนูและค่าใช้จ่าย</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full bg-secondary p-2 text-secondary-foreground"><X className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[54vh] overflow-y-auto px-5">
          {lines.length === 0 ? <p className="py-10 text-center text-muted-foreground">ยังไม่มีรายการอาหาร</p> : <ul className="divide-y divide-border">{lines.map((line) => <li key={`${line.item.id}-${optionsKey(line.selected)}`} className="flex gap-3 py-4"><img src={line.item.image} alt={line.item.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="font-medium text-card-foreground">{line.item.name} <span className="text-muted-foreground">× {line.quantity}</span></p><p className="shrink-0 font-display font-semibold text-primary">{(line.item.price + optionPrice(line.selected)) * line.quantity} บาท</p></div>{optionSummary(line.selected) && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{optionSummary(line.selected)}</p>}</div></li>)}</ul>}
        </div>
        <footer className="flex items-center justify-between border-t border-border px-5 py-5"><span className="font-medium text-muted-foreground">ยอดรวมทั้งหมด</span><span className="font-display text-2xl font-bold text-primary">{totalPrice} บาท</span></footer>
      </section>
    </div>
  )
}

