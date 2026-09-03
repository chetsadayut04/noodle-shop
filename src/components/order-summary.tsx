'use client'

import { useState, useEffect } from 'react'
import { Receipt, X, QrCode, Upload, Check, Copy, Loader2, CheckCircle2, Download, Clock, RefreshCw } from 'lucide-react'
import { optionPrice, optionSummary, optionsKey, type MenuItem, type SelectedOptions } from '@/lib/menu'
import { generatePromptPayQR, uploadSlipForOrder, createOrderOnly } from '@/lib/payment'
import { createClient } from '@/utils/supabase/client'

export type SummaryLine = { item: MenuItem; selected: SelectedOptions; instructions?: string; packaging?: 'dine-in' | 'takeaway'; quantity: number }

type OrderSummaryProps = {
  lines: SummaryLine[]
  totalPrice: number
  tableId?: string
  lastOrderId?: string | null
  onClose: () => void
  onPaymentSuccess?: () => void
}

export function OrderSummary({ lines, totalPrice, tableId = 'T1', lastOrderId, onClose, onPaymentSuccess }: OrderSummaryProps) {
  const [showQR, setShowQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // 15-minute countdown timer
  const INITIAL_TIME = 15 * 60
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)

  const promptPayNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '0830256721'

  useEffect(() => {
    if (!showQR || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [showQR, timeLeft])

  useEffect(() => {
    if (showQR && totalPrice > 0) {
      setTimeLeft(INITIAL_TIME)
      generatePromptPayQR(promptPayNumber, totalPrice).then(setQrCodeUrl).catch(console.error)
    }
  }, [showQR, totalPrice, promptPayNumber])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleRefreshQR = async () => {
    setTimeLeft(INITIAL_TIME)
    try {
      const url = await generatePromptPayQR(promptPayNumber, totalPrice)
      setQrCodeUrl(url)
    } catch (err) {
      console.error('Failed to regenerate QR code:', err)
    }
  }

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `PromptPay-QR-${totalPrice}THB.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSlipFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSlipPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(promptPayNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirmPayment = async () => {
    setLoading(true)
    try {
      let targetOrderId = lastOrderId

      // If user hasn't created order yet, create one now
      if (!targetOrderId && lines.length > 0) {
        const newOrder = await createOrderOnly({
          tableId,
          total: totalPrice,
          lines,
        })
        targetOrderId = newOrder.id
      }

      if (!targetOrderId) {
        alert('ไม่พบบันทึกรายการสั่งซื้อ กรุณากดสั่งอาหารก่อนครับ')
        return
      }

      const supabase = createClient()
      await supabase.from('orders').update({ status: 'paid' }).eq('id', targetOrderId)
      await supabase.from('payments').update({ status: 'paid' }).eq('order_id', targetOrderId)

      setUploadSuccess(true)
      setTimeout(() => {
        setUploadSuccess(false)
        setShowQR(false)
        if (onPaymentSuccess) onPaymentSuccess()
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error('Confirm payment error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูลออเดอร์ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="ปิดสรุปรายการ" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <section aria-labelledby="summary-title" className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <h2 id="summary-title" className="font-display text-xl font-bold text-card-foreground">สรุปรายการอาหาร &amp; ใบเสร็จ</h2>
              <p className="text-xs font-semibold text-muted-foreground">
                โต๊ะ {tableId} {lastOrderId ? `· ออเดอร์ #${lastOrderId.slice(0, 8).toUpperCase()}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-full bg-secondary p-2 text-secondary-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* List of ordered items */}
        <div className="mt-4 max-h-[40vh] overflow-y-auto pr-1">
          {lines.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="text-xs">ยังไม่มีรายการอาหารในตะกร้า</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((line) => (
                <li key={`${line.item.id}-${optionsKey(line.selected, line.instructions, line.packaging)}`} className="flex gap-3 py-3 text-xs">
                  <img src={line.item.image} alt={line.item.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between font-semibold text-card-foreground">
                      <span>{line.item.name} × {line.quantity}</span>
                      <span className="text-primary">{(line.item.price + optionPrice(line.selected)) * line.quantity}฿</span>
                    </div>
                    {optionSummary(line.selected, line.instructions, line.packaging) && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{optionSummary(line.selected, line.instructions, line.packaging)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Total Price & Payment Section */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-muted-foreground">ยอดรวมทั้งสิ้น:</span>
            <span className="font-display text-2xl font-bold text-primary">{totalPrice} บาท</span>
          </div>

          {lines.length > 0 && totalPrice > 0 ? (
            !showQR ? (
              <button
                type="button"
                onClick={() => setShowQR(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-base font-bold text-primary-foreground shadow-md transition-transform active:scale-95"
              >
                <QrCode className="h-5 w-5" /> แสดง QR Code สแกนจ่าย (PromptPay)
              </button>
            ) : (
            /* PromptPay QR Code & Slip Section */
            <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4 text-center space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-display text-sm font-bold text-primary">สแกนจ่าย {totalPrice} บาท</span>
                <button type="button" onClick={() => setShowQR(false)} className="text-xs text-muted-foreground hover:underline">
                  ซ่อน QR
                </button>
              </div>

              {/* Countdown Timer Badge */}
              <div>
                {timeLeft > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                    <Clock className="h-3.5 w-3.5 animate-pulse" /> กรุณาชำระเงินภายใน {formatTime(timeLeft)} นาที
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-bold text-destructive">
                    <Clock className="h-3.5 w-3.5" /> QR Code หมดอายุ
                  </span>
                )}
              </div>

              {/* QR Image */}
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white p-2 border border-border">
                {timeLeft > 0 ? (
                  qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="PromptPay QR" className="h-full w-full object-contain" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <p className="text-[11px] text-muted-foreground mb-2">QR หมดเวลาแล้ว</p>
                    <button
                      type="button"
                      onClick={handleRefreshQR}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground"
                    >
                      <RefreshCw className="h-3 w-3" /> สร้าง QR ใหม่
                    </button>
                  </div>
                )}
              </div>

              {/* Download & Copy Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {qrCodeUrl && timeLeft > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> บันทึกรูป QR
                  </button>
                )}
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  <span>พร้อมเพย์: <strong>{promptPayNumber}</strong></span>
                  <button type="button" onClick={handleCopyNumber} className="text-primary">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* 1-Click Confirm Payment Button */}
              {uploadSuccess ? (
                <div className="rounded-xl bg-emerald-500/15 p-3 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 mb-1" />
                  ยืนยันชำระเงินเรียบร้อย สั่งอาหารสำเร็จ!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={loading || timeLeft <= 0}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 font-display text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> ยืนยันชำระเงินเรียบร้อย
                    </>
                  )}
                </button>
              )}
            </div>
          )
        ) : (
          <div className="mt-4 rounded-2xl bg-secondary/50 p-3.5 text-center text-xs font-semibold text-muted-foreground">
            กรุณาเลือกรายการอาหารในเมนูก่อนชำระเงินครับ
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
