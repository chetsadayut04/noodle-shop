'use client'

import { useState } from 'react'
import { Plus, Minus, SlidersHorizontal, X } from 'lucide-react'
import type { MenuItem, SelectedOptions, MenuOption } from '@/lib/menu'
import { defaultOptions, hasRequiredOptions, optionPrice } from '@/lib/menu'

type MenuCardProps = {
  item: MenuItem
  quantity: number
  isAvailable?: boolean
  onAdd: (item: MenuItem, selected: SelectedOptions) => void
  onRemove: (item: MenuItem) => void
}

export function MenuCard({ item, quantity, isAvailable = true, onAdd, onRemove }: MenuCardProps) {
  const [customizing, setCustomizing] = useState(false)
  const [selected, setSelected] = useState<SelectedOptions>(() => defaultOptions(item))

  const choose = (groupId: string, option: MenuOption) => setSelected((prev) => ({ ...prev, [groupId]: [option] }))
  const add = () => {
    if (!item.options || hasRequiredOptions(item, selected)) {
      onAdd(item, item.options ? selected : {})
      setCustomizing(false)
    }
  }

  return (
    <article className={`group flex gap-4 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md sm:flex-col sm:gap-0 sm:p-0 ${!isAvailable ? 'opacity-75' : ''}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-40 sm:w-full sm:rounded-b-none">
        <img
          src={item.image}
          alt={item.name}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${!isAvailable ? 'grayscale opacity-60' : ''}`}
        />
        {!isAvailable && (
          <span className="absolute top-2 right-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-xs">
            สินค้าหมด
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col sm:p-4">
        <h3 className="font-display text-lg font-semibold leading-tight text-card-foreground text-balance">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-display text-lg font-bold text-primary">
            {item.price}<span className="ml-0.5 text-sm font-medium text-muted-foreground">บาท</span>
          </span>

          {!isAvailable ? (
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">
              สินค้าหมด
            </span>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={() => (item.options ? setCustomizing(true) : add())}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
              aria-label={`เพิ่ม ${item.name} ลงตะกร้า`}
            >
              <Plus className="h-4 w-4" />เพิ่ม
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-full bg-secondary p-1">
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-secondary-foreground"
                aria-label={`ลด ${item.name}`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-5 text-center font-display font-bold text-secondary-foreground">{quantity}</span>
              <button
                type="button"
                onClick={() => (item.options ? setCustomizing(true) : add())}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-label={`เพิ่ม ${item.name}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {customizing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ปรับแต่งเมนู</p>
                <h2 className="font-display text-2xl font-bold text-card-foreground">{item.name}</h2>
              </div>
              <button type="button" onClick={() => setCustomizing(false)} aria-label="ปิด" className="rounded-full bg-secondary p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {(item.options?.groups ?? []).map((group) => (
                <fieldset key={group.id}>
                  <legend className="mb-2 flex items-center gap-2 font-display font-semibold text-card-foreground">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    {group.label}
                    {group.required && <span className="text-xs font-normal text-primary">จำเป็น</span>}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((option) => {
                      const extraPrice = option.price ?? 0
                      const priceLabel = extraPrice > 0 ? `+${extraPrice}฿` : '+0฿'
                      const isSelected = selected[group.id]?.[0]?.id === option.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => choose(group.id, option)}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs sm:text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 font-semibold text-primary'
                              : 'border-border text-card-foreground hover:bg-secondary/40'
                          }`}
                        >
                          <span>{option.label}</span>
                          <span className={`text-[11px] font-bold ${extraPrice > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {priceLabel}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}

              {item.options?.extras && (
                <fieldset>
                  <legend className="mb-2 font-display font-semibold text-card-foreground">เพิ่มของได้ตามใจ</legend>
                  <div className="space-y-2">
                    {item.options.extras.map((option) => (
                      <label key={option.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected.extras?.some((x) => x.id === option.id) ?? false}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                extras: e.target.checked
                                  ? [...(prev.extras ?? []), option]
                                  : (prev.extras ?? []).filter((x) => x.id !== option.id),
                              }))
                            }
                            className="accent-primary"
                          />
                          {option.label}
                        </span>
                        <span>+{option.price} บาท</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            <button
              type="button"
              onClick={add}
              disabled={!hasRequiredOptions(item, selected)}
              className="mt-6 w-full rounded-full bg-primary py-3.5 font-display text-lg font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              เพิ่มลงตะกร้า · {item.price + optionPrice(selected)} บาท
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
