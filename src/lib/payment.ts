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

// Create Order ONLY (No immediate QR payment required)
export async function createOrderOnly({
  tableId = 'T1',
  total,
  lines = [],
}: {
  tableId?: string
  total: number
  lines?: CartLine[]
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
      const selectedOptionList = Object.values(line.selected).flat()
      for (const opt of selectedOptionList) {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: opt.label,
          extra_price: opt.price || 0,
        })
      }
      if (line.packaging === 'takeaway') {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: '🥡 ใส่ถุงกลับบ้าน',
          extra_price: 0,
        })
      }
      if (line.instructions && line.instructions.trim()) {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: `📝 ${line.instructions.trim()}`,
          extra_price: 0,
        })
      }
    }
  }

  // 3. Create initial pending payment record
  await supabase.from('payments').insert({
    order_id: order.id,
    method: 'promptpay',
    amount: total,
    status: 'pending',
  })

  return order
}

// Upload Slip and attach strictly 1-to-1 with specific orderId
export async function uploadSlipForOrder({
  tableId = 'T1',
  orderId,
  slipFile,
}: {
  tableId?: string
  orderId: string
  slipFile: File
}) {
  const supabase = createClient()
  let slipUrl: string | null = null

  if (slipFile && slipFile.size > 0) {
    const fileExt = slipFile.name.split('.').pop() || 'png'
    const fileName = `order-${orderId}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(fileName, slipFile, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`อัปโหลดสลิปล้มเหลว: ${uploadError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('slips')
      .getPublicUrl(fileName)
    slipUrl = publicUrlData?.publicUrl || null

    // Update ONLY the target orderId payment row
    await supabase
      .from('payments')
      .update({
        slip_url: slipUrl,
        status: 'submitted',
      })
      .eq('order_id', orderId)

    // Auto-update order status to paid when customer uploads slip
    await supabase
      .from('orders')
      .update({
        status: 'paid',
      })
      .eq('id', orderId)
  }

  return slipUrl
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

  // 2. Insert order items & order item options
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
      const selectedOptionList = Object.values(line.selected).flat()
      for (const opt of selectedOptionList) {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: opt.label,
          extra_price: opt.price || 0,
        })
      }
      if (line.packaging === 'takeaway') {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: '🥡 ใส่ถุงกลับบ้าน',
          extra_price: 0,
        })
      }
      if (line.instructions && line.instructions.trim()) {
        await supabase.from('order_item_options').insert({
          order_item_id: orderItem.id,
          name: `📝 ${line.instructions.trim()}`,
          extra_price: 0,
        })
      }
    }
  }

  let slipUrl: string | null = null

  if (slipFile && slipFile.size > 0) {
    const fileExt = slipFile.name.split('.').pop() || 'png'
    const fileName = `${order.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(fileName, slipFile, {
        cacheControl: '3600',
        upsert: true,
      })

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from('slips')
        .getPublicUrl(fileName)
      slipUrl = publicUrlData?.publicUrl || null
    }
  }

  // 3. Insert payment record
  const paymentStatus = slipUrl ? 'submitted' : 'pending'
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      method: 'promptpay',
      amount: total,
      slip_url: slipUrl,
      status: paymentStatus,
    })
    .select()
    .single()

  if (slipUrl) {
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id)
  }

  return { order, payment }
}
