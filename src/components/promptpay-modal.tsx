'use client'

import { useState, useEffect } from 'react'
import { X, QrCode, Upload, CheckCircle2, Copy, Check, Loader2, Download, Clock, RefreshCw } from 'lucide-react'
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

  // 15-minute countdown timer
  const INITIAL_TIME = 15 * 60
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)

  const promptPayNumber = process.env.NEXT_PUBLIC_PROMPTPAY_NUMBER || '0830256721'

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

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
              <div className="mb-1 text-xs font-semibold text-blue-900 tracking-wide uppercase">พร้อมเพย์ PromptPay</div>
              
              {/* Countdown Timer Badge */}
              <div className="mb-2">
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

              {timeLeft > 0 ? (
                qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="PromptPay QR Code" className="h-56 w-56 object-contain" />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )
              ) : (
                <div className="flex h-56 w-56 flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-muted-foreground mb-3">QR Code หมดเวลาแล้ว กรุณากดสร้างใหม่</p>
                  <button
                    type="button"
                    onClick={handleRefreshQR}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs"
                  >
                    <RefreshCw className="h-4 w-4" /> สร้าง QR Code ใหม่
                  </button>
                </div>
              )}
              
              {/* Download & Copy Buttons */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {qrCodeUrl && timeLeft > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> บันทึกรูป QR
                  </button>
                )}

                <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
                  <span>เบอร์: <strong>{promptPayNumber}</strong></span>
                  <button type="button" onClick={handleCopyNumber} className="text-primary hover:text-primary/80">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Slip Upload Area */}
            <div className="mt-5 space-y-2">
              <label className="block text-sm font-semibold text-card-foreground">แนบสลิปการโอนเงิน (ถ้ามี)</label>
              
              {slipPreview ? (
                <div className="relative rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-center overflow-hidden">
                  <div className="relative mx-auto inline-block max-w-full overflow-hidden rounded-xl border border-border shadow-xs bg-white">
                    <img src={slipPreview} alt="Slip Preview" className="max-h-60 w-auto object-contain block mx-auto" />
                    <button
                      type="button"
                      onClick={() => { setSlipFile(null); setSlipPreview(null) }}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                      title="เปลี่ยนรูปสลิป"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => { setSlipFile(null); setSlipPreview(null) }}
                      className="text-xs font-semibold text-destructive hover:underline"
                    >
                      เปลี่ยนรูปสลิปใหม่
                    </button>
                  </div>
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
