'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import QRCode from 'qrcode'
import { Printer, ArrowLeft, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'

type TableItem = {
  id: string
  name: string
  is_active: boolean
}

type TableQRCard = {
  table: TableItem
  qrDataUrl: string
}

export default function PrintQRPage() {
  const [cards, setCards] = useState<TableQRCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function generateQRCards() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: tables } = await supabase
          .from('tables')
          .select('*')
          .order('id')

        if (tables) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://noodle-shop-eight.vercel.app'
          
          const cardPromises = tables.map(async (t) => {
            const tableUrl = `${origin}/table/${t.id}`
            const qrDataUrl = await QRCode.toDataURL(tableUrl, {
              margin: 1,
              width: 400,
              color: {
                dark: '#b91c1c',
                light: '#ffffff',
              },
            })
            return { table: t, qrDataUrl }
          })

          const generatedCards = await Promise.all(cardPromises)
          setCards(generatedCards)
        }
      } catch (err) {
        console.error('Error generating QR cards:', err)
      } finally {
        setLoading(false)
      }
    }

    generateQRCards()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  return (
    <main className="min-h-dvh bg-slate-100 p-4 sm:p-8 print:bg-white print:p-0">
      {/* Top Action Bar (Hidden when printing) */}
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-slate-300 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> กลับหน้า Admin
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">ป้ายตั้งโต๊ะ QR Code (ร้านแม่แต๋)</h1>
            <p className="text-xs text-slate-500">สำหรับพิมพ์ตั้งโต๊ะให้ลูกค้าสแกนสั่งอาหาร (ขนาดการ์ด A6)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-full bg-red-700 px-6 py-2.5 font-display text-sm font-bold text-white shadow-md hover:bg-red-800 transition-transform active:scale-95"
        >
          <Printer className="h-4 w-4" /> 🖨️ กดพิมพ์ป้ายทั้งหมด (Print All)
        </button>
      </header>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center text-sm font-semibold text-slate-500 print:hidden">
          กำลังสร้างป้าย QR Code สำหรับทุกโต๊ะ...
        </div>
      ) : (
        /* Printable QR Cards Container */
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2 print:mt-0 print:grid-cols-2 print:gap-4 print:max-w-none">
          {cards.map(({ table, qrDataUrl }) => (
            <div
              key={table.id}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-4 border-red-700/20 bg-amber-50/40 p-6 text-center shadow-lg print:break-inside-avoid print:rounded-2xl print:border-2 print:shadow-none print:p-5 print:bg-white"
              style={{ minHeight: '140mm' }}
            >
              {/* Top Decorative Border */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-red-700" />

              {/* Header / Brand Name */}
              <div className="pt-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-red-700/10 px-3.5 py-1 text-xs font-bold text-red-800">
                  <UtensilsCrossed className="h-3.5 w-3.5" /> ร้านแม่แต๋
                </div>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900">
                  {table.name}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-slate-600">ก๋วยเตี๋ยวรสเด็ด &amp; ข้าว</p>
              </div>

              {/* QR Code Container */}
              <div className="my-4 mx-auto flex flex-col items-center">
                <div className="rounded-2xl border-2 border-red-700/30 bg-white p-3 shadow-md">
                  <img src={qrDataUrl} alt={`QR Table ${table.id}`} className="h-44 w-44 object-contain" />
                </div>
                <span className="mt-2 text-[11px] font-mono font-bold text-slate-500">
                  สแกนเพื่อสั่งอาหาร (โต๊ะ {table.id})
                </span>
              </div>

              {/* 3 Step Guide */}
              <div className="rounded-2xl bg-white/80 p-3 border border-red-700/10 print:bg-slate-50">
                <div className="grid grid-cols-3 gap-1 text-[11px] font-bold text-slate-700">
                  <div className="flex flex-col items-center">
                    <span className="text-base">📱</span>
                    <span>1. สแกน QR</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base">🍜</span>
                    <span>2. เลือกสั่งอาหาร</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base">💳</span>
                    <span>3. สแกนจ่าย</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-3 text-[10px] text-slate-500 font-medium">
                *หากต้องการความช่วยเหลือเพิ่มเติม สามารถแจ้งพนักงานได้เลยค่ะ
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

