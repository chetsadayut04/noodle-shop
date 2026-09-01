import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { createClient } from '@/utils/supabase/client'
import type { CartLine } from '@/components/floating-cart'
import { optionPrice } from '@/lib/menu'

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
  lines = [],
  slipFile,
}: {
  tableId?: string
  total: number
  lines?: CartLine[]
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

  // 2. Insert order items & order item options if lines exist
  for (const line of lines) {
    const itemPrice = line.item.price + optionPrice(line.selected)
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        name: line.item.name,
        price: itemPrice,
        qty: line.quantity,
      })
      .select()
      .single()

    if (!itemError && orderItem) {
      // Insert item options/customizations
      const selectedOptionList = Object.values(line.selected).flat()
      for (const opt of selectedOptionList) {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: opt.label,
          extra_price: opt.price || 0,
        })
      }
    }
  }

  let slipUrl: string | null = null

  // 3. Upload slip file to Supabase Storage bucket 'slips' if provided
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

  // 4. Insert payment record
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
