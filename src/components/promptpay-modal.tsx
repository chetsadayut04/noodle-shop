'use client'

import { useState, useEffect } from 'react'
import { X, QrCode, Upload, CheckCircle2, Copy, Check, Loader2 } from 'lucide-react'
import { generatePromptPayQR, createOrderWithPayment } from '@/lib/payment'
import type { CartLine } from '@/components/floating-cart'

type PromptPayModalProps = {
  totalPrice: number
  tableId?: string
  lines?: CartLine[]
  onClose: () => void
  onSuccess: () => void
}

export function PromptPayModal({ totalPrice, tableId = 'T1', lines = [], onClose, onSuccess }: PromptPayModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const promptPayNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '0830256721'

  useEffect(() => {
    let isMounted = true
    async function loadQR() {
      try {
        const url = await generatePromptPayQR(promptPayNumber, totalPrice)
        if (isMounted) setQrCodeUrl(url)
      } catch (err) {
        console.error('Failed to generate QR code:', err)
      }
    }
    loadQR()
    return () => {
      isMounted = false
    }
  }, [totalPrice, promptPayNumber])

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

  const handleSubmit = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      await createOrderWithPayment({
        tableId,
        total: totalPrice,
        lines,
        slipFile,
      })
      setCompleted(true)
      setTimeout(() => {
        onSuccess()
      }, 3000)
    } catch (err: any) {
      console.error('Payment order submission error:', err)
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูลสลิป กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="ปิดหน้าชำระเงิน" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="ปิด" className="absolute right-4 top-4 rounded-full bg-secondary p-2 text-secondary-foreground">
          <X className="h-5 w-5" />
        </button>

        {completed ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 animate-bounce" />
            <h2 className="mt-4 font-display text-2xl font-bold text-card-foreground">ส่งรายการสั่งซื้อเรียบร้อย!</h2>
            <p className="mt-2 text-sm text-muted-foreground">ทางร้านได้รับข้อมูลเรียบร้อยแล้ว กรุณารออาหารสักครู่</p>
          </div>
        ) : (
          <div>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <QrCode className="h-4 w-4" /> ชำระเงินผ่าน PromptPay
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-card-foreground">สแกนจ่าย {totalPrice} บาท</h2>
              <p className="text-xs text-muted-foreground">โต๊ะ: {tableId}</p>
            </div>

            {/* QR Code Container */}
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 shadow-inner">
              <div className="mb-2 text-xs font-semibold text-blue-900 tracking-wide uppercase">พร้อมเพย์ PromptPay</div>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="PromptPay QR Code" className="h-56 w-56 object-contain" />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              
              {/* Account / Phone Number */}
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
                <span>หมายเลข: <strong>{promptPayNumber}</strong></span>
                <button type="button" onClick={handleCopyNumber} className="text-primary hover:text-primary/80">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Slip Upload Area */}
            <div className="mt-5 space-y-2">
              <label className="block text-sm font-semibold text-card-foreground">แนบสลิปการโอนเงิน (ถ้ามี)</label>
              
              {slipPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-secondary p-2 text-center">
                  <img src={slipPreview} alt="Slip Preview" className="mx-auto max-h-40 object-contain rounded-lg" />
                  <button type="button" onClick={() => { setSlipFile(null); setSlipPreview(null) }} className="mt-2 text-xs font-medium text-destructive underline">
                    เปลี่ยนรูปสลิป
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/50 p-4 transition-colors hover:bg-secondary">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-2 text-xs font-medium text-muted-foreground">กดเพื่ออัปโหลดสลิปเงินโอน</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            {errorMessage && (
              <p className="mt-3 text-center text-xs font-medium text-destructive">{errorMessage}</p>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> กำลังส่งข้อมูล...
                </>
              ) : (
                'แจ้งชำระเงิน / ส่งรายการ'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
