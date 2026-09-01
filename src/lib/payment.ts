import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { createClient } from '@/utils/supabase/client'

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
  const supabase = createClient()

  // 1. Insert order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      table_id: tableId,
      status: 'pending',
      total,
    })
    .select()
    .single()

  if (orderError) {
    throw new Error(`การสร้างรายการสั่งซื้อล้มเหลว: ${orderError.message}`)
  }

  let slipUrl: string | null = null

  // 2. Upload slip file to Supabase Storage bucket 'slips' if provided
  if (slipFile && slipFile.size > 0) {
    const fileExt = slipFile.name.split('.').pop() || 'png'
    const fileName = `${order.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(fileName, slipFile, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.warn('Slip upload warning:', uploadError.message)
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('slips')
        .getPublicUrl(fileName)
      slipUrl = publicUrlData?.publicUrl || null
    }
  }

  // 3. Insert payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      method: 'promptpay',
      amount: total,
      slip_url: slipUrl,
      status: 'pending',
    })
    .select()
    .single()

  if (paymentError) {
    throw new Error(`การสร้างบันทึกการชำระเงินล้มเหลว: ${paymentError.message}`)
  }

  return { order, payment }
}
