import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const slipFile = formData.get('slip') as File | null
    const totalStr = formData.get('total') as string | null
    const tableId = (formData.get('tableId') as string | null) || 'T1'

    if (!totalStr) {
      return NextResponse.json({ error: 'Missing total amount' }, { status: 400 })
    }

    const total = parseFloat(totalStr)
    const supabase = await createClient()

    // 1. Create order record
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
      return NextResponse.json({ error: `Order creation failed: ${orderError.message}` }, { status: 500 })
    }

    let slipUrl: string | null = null
    let isSlipVerified = false

    // 2. Upload slip image to Supabase Storage if provided
    if (slipFile && slipFile.size > 0) {
      const fileExt = slipFile.name.split('.').pop() || 'png'
      const fileName = `${order.id}-${Date.now()}.${fileExt}`

      const fileBuffer = await slipFile.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(fileName, fileBuffer, {
          contentType: slipFile.type || 'image/png',
          upsert: true,
        })

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('slips')
          .getPublicUrl(fileName)
        slipUrl = publicUrlData?.publicUrl || null
      }

      // 3. Perform Slip Verification via SlipOK API if SLIPOK_API_KEY is configured
      const slipOkApiKey = process.env.SLIPOK_API_KEY
      const slipOkBranchId = process.env.SLIPOK_BRANCH_ID

      if (slipOkApiKey) {
        try {
          const apiFormData = new FormData()
          apiFormData.append('files', slipFile)

          const slipOkResponse = await fetch(
            `https://api.slipok.com/api/line/apikey/${slipOkApiKey}`,
            {
              method: 'POST',
              headers: {
                ...(slipOkBranchId ? { 'x-branch-id': slipOkBranchId } : {}),
              },
              body: apiFormData,
            }
          )

          const result = await slipOkResponse.json()

          if (result.success && result.data) {
            const paidAmount = parseFloat(result.data.amount)
            if (paidAmount >= total) {
              isSlipVerified = true
            }
          }
        } catch (verifyErr) {
          console.warn('Slip verification API error:', verifyErr)
        }
      }
    }

    // Update order status if slip is verified
    const finalOrderStatus = isSlipVerified ? 'paid' : 'pending'
    const finalPaymentStatus = isSlipVerified ? 'verified' : 'pending'

    if (isSlipVerified) {
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id)
    }

    // 4. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        method: 'promptpay',
        amount: total,
        slip_url: slipUrl,
        status: finalPaymentStatus,
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: `Payment creation failed: ${paymentError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      verified: isSlipVerified,
      order: {
        ...order,
        status: finalOrderStatus,
      },
      payment,
    })
  } catch (err: any) {
    console.error('Verify slip error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
