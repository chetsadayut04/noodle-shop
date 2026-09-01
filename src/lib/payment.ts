import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

export async function generatePromptPayQR(phoneNumber: string, amount: number): Promise<string> {
  const payload = generatePayload(phoneNumber, { amount })
  const qrDataUrl = await QRCode.toDataURL(payload, {
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
  return qrDataUrl
}

export async function createOrderWithPayment({
  tableId = 'T1',
  total,
  slipFile,
}: {
  tableId?: string
  total: number
  slipFile?: File | null
}) {
  const formData = new FormData()
  formData.append('tableId', tableId)
  formData.append('total', total.toString())
  if (slipFile) {
    formData.append('slip', slipFile)
  }

  const response = await fetch('/api/verify-slip', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!response.ok || result.error) {
    throw new Error(result.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิปการชำระเงิน')
  }

  return {
    order: result.order,
    payment: result.payment,
    verified: result.verified as boolean,
  }
}
