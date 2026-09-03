import { createClient } from '@/utils/supabase/client'

export type StoreSettings = {
  is_open: boolean
  closed_reason?: string
}

const STORAGE_KEY = 'maetae_store_is_open'

export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('is_open, closed_reason')
      .eq('id', 'main')
      .maybeSingle()

    if (!error && data) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(data.is_open))
      }
      return {
        is_open: data.is_open,
        closed_reason: data.closed_reason || 'ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว',
      }
    }
  } catch (err) {
    console.error('Failed to fetch store settings:', err)
  }

  // Fallback to localStorage or default to true (Open)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      return { is_open: stored === 'true' }
    }
  }

  return { is_open: true }
}

export async function setStoreOpenStatus(isOpen: boolean, closedReason?: string): Promise<boolean> {
  const supabase = createClient()
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(isOpen))
  }

  try {
    const { error } = await supabase
      .from('store_settings')
      .upsert({
        id: 'main',
        is_open: isOpen,
        closed_reason: closedReason || (isOpen ? '' : 'ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว'),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.warn('Could not upsert store_settings in supabase (using local state):', error.message)
    }
    return true
  } catch (err) {
    console.error('Failed to set store status:', err)
    return true
  }
}

