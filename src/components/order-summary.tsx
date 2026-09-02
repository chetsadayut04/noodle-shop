'use client'

import { useState, useEffect } from 'react'
import { Receipt, X, QrCode, Upload, Check, Copy, Loader2, CheckCircle2 } from 'lucide-react'
import { optionPrice, optionSummary, optionsKey, type MenuItem, type SelectedOptions } from '@/lib/menu'
import { generatePromptPayQR, uploadSlipForOrder, createOrderOnly } from '@/lib/payment'

export type SummaryLine = { item: MenuItem; selected: SelectedOptions; quantity: number }

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

  const promptPayNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '0812345678'

  useEffect(() => {
    if (showQR && totalPrice > 0) {
      generatePromptPayQR(promptPayNumber, totalPrice).then(setQrCodeUrl).catch(console.error)
    }
  }, [showQR, totalPrice, promptPayNumber])

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

  const handleUploadSlip = async () => {
    if (!slipFile) {
      alert('กรุณาเลือกไฟล์สลิปการโอนเงินก่อนกดส่งครับ')
      return
    }

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
        alert('ไม่พบบันทึกรายการสั่งซื้อ กรุณากดสั่งอาหารก่อนแนบสลิปครับ')
        return
      }

      await uploadSlipForOrder({ tableId, orderId: targetOrderId, slipFile })
      setUploadSuccess(true)
      setTimeout(() => {
        setUploadSuccess(false)
        setShowQR(false)
        if (onPaymentSuccess) onPaymentSuccess()
        onClose()
      }, 2200)
    } catch (err: any) {
      console.error('Upload slip error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิป กรุณาลองใหม่อีกครั้ง')
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
              <p className="text-xs text-muted-foreground">โต๊ะ: {tableId}</p>
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
                <li key={`${line.item.id}-${optionsKey(line.selected)}`} className="flex gap-3 py-3 text-xs">
                  <img src={line.item.image} alt={line.item.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between font-semibold text-card-foreground">
                      <span>{line.item.name} × {line.quantity}</span>
                      <span className="text-primary">{(line.item.price + optionPrice(line.selected)) * line.quantity}฿</span>
                    </div>
                    {optionSummary(line.selected) && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{optionSummary(line.selected)}</p>
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

          {!showQR ? (
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

              {/* QR Image */}
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white p-2 border border-border">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="PromptPay QR" className="h-full w-full object-contain" />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs">
                <span>พร้อมเพย์: <strong>{promptPayNumber}</strong></span>
                <button type="button" onClick={handleCopyNumber} className="text-primary">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Upload Slip Area */}
              {uploadSuccess ? (
                <div className="rounded-xl bg-emerald-500/15 p-3 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 mb-1" />
                  ส่งสลิปการโอนเงินเรียบร้อย!
                </div>
              ) : (
                <div className="pt-2 text-left space-y-2">
                  <label className="block text-xs font-semibold text-card-foreground">แนบสลิปโอนเงิน (ถ้ามี):</label>
                  {slipPreview ? (
                    <div className="relative rounded-xl border border-border bg-card p-2 text-center">
                      <img src={slipPreview} alt="Slip" className="mx-auto max-h-32 object-contain rounded-lg" />
                      <button
                        type="button"
                        onClick={handleUploadSlip}
                        disabled={loading}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ส่งสลิปการชำระเงิน'}
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-3 text-xs font-semibold text-muted-foreground hover:bg-secondary">
                      <Upload className="h-4 w-4 text-primary" /> อัปโหลดสลิปโอนเงิน
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
