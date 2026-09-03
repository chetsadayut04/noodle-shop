'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getStoreSettings, setStoreOpenStatus } from '@/lib/store-settings'
import {
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  Table as TableIcon,
  LogOut,
  Plus,
  Trash2,
  Eye,
  ArrowRight,
  ShieldAlert,
  QrCode,
  Check,
  X,
  TrendingUp,
  Utensils,
  Sliders,
  Banknote,
  Smartphone,
  Calendar,
  Camera,
  UploadCloud,
  Loader2,
  Pencil,
  PlusCircle,
  Minus,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type TableItem = {
  id: string
  name: string
  is_active: boolean
}

type MenuItem = {
  id: string
  category_id: string
  name: string
  price: number
  image_url?: string | null
  badge?: string | null
  is_available: boolean
}

type OptionGroup = {
  id: string
  menu_item_id: string
  name: string
  is_required: boolean
}

type OptionItem = {
  id: string
  group_id: string
  name: string
  extra_price: number
}

type PaymentRecord = {
  id?: string
  slip_url?: string | null
  amount?: number | null
  status?: string | null
  payment_method?: string | null
  method?: string | null
}

type Order = {
  id: string
  table_id: string
  status: string
  total: number
  created_at: string
  payment_method?: string | null
  payments?: PaymentRecord[]
}

const COLORS = ['#eab308', '#3b82f6', '#a855f7', '#10b981']

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'tables'>('overview')
  const [tables, setTables] = useState<TableItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [optionsList, setOptionsList] = useState<OptionItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  
  // Selected Menu for Unified Option Editor
  const [selectedMenuId, setSelectedMenuId] = useState<string>('')
  const [copySourceMenuId, setCopySourceMenuId] = useState<string>('')

  // New Table Form
  const [newTableId, setNewTableId] = useState('')
  const [newTableName, setNewTableName] = useState('')

  // New Menu Item Form
  const [newItemId, setNewItemId] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('noodles')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemImageFile, setNewItemImageFile] = useState<File | null>(null)
  const [newItemImagePreview, setNewItemImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // New Option Group Form
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRequired, setNewGroupRequired] = useState(false)

  // Inline Option Forms (mapped by groupId)
  const [inlineOptionNames, setInlineOptionNames] = useState<Record<string, string>>({})
  const [inlineOptionPrices, setInlineOptionPrices] = useState<Record<string, string>>({})

  const getTodayISO = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  type FilterRange = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
  const [filterRange, setFilterRange] = useState<FilterRange>('today')
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>(getTodayISO())
  const [loading, setLoading] = useState(true)
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [posModalOpen, setPosModalOpen] = useState(false)
  const [posTableId, setPosTableId] = useState('1')
  const [posCart, setPosCart] = useState<{ menuItem: MenuItem; qty: number }[]>([])
  const [posSubmitting, setPosSubmitting] = useState(false)
  const router = useRouter()

  const handleToggleStoreOpen = async () => {
    const nextStatus = !isStoreOpen
    setIsStoreOpen(nextStatus)
    await setStoreOpenStatus(nextStatus)
  }

  const handlePosAddToCart = (item: MenuItem) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItem.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { menuItem: item, qty: 1 }]
    })
  }

  const handlePosRemoveFromCart = (itemId: string) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItem.id === itemId)
      if (idx < 0) return prev
      if (prev[idx].qty <= 1) {
        return prev.filter((c) => c.menuItem.id !== itemId)
      }
      const next = [...prev]
      next[idx] = { ...next[idx], qty: next[idx].qty - 1 }
      return next
    })
  }

  const handlePosSubmitOrder = async () => {
    if (posCart.length === 0) {
      alert('กรุณาเลือกรายการอาหารก่อนกดสั่งครับ')
      return
    }
    setPosSubmitting(true)
    try {
      const supabase = createClient()
      const total = posCart.reduce((sum, c) => sum + c.menuItem.price * c.qty, 0)
      const tableStr = posTableId === 'takeaway' ? 'กลับบ้าน' : `T${posTableId}`

      // 1. Insert order
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          table_id: tableStr,
          status: 'pending',
          total,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // 2. Insert order items
      const orderItems = posCart.map((c) => ({
        order_id: newOrder.id,
        menu_item_id: c.menuItem.id,
        name: c.menuItem.name,
        price: c.menuItem.price,
        qty: c.qty,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      // 3. Insert payment record (Cash)
      await supabase.from('payments').insert({
        order_id: newOrder.id,
        payment_method: 'cash',
        amount: total,
        status: 'pending',
      })

      setPosCart([])
      setPosModalOpen(false)
      fetchData()
    } catch (err: any) {
      console.error('POS order error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกออเดอร์')
    } finally {
      setPosSubmitting(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      getStoreSettings().then((s) => setIsStoreOpen(s.is_open))
      const supabase = createClient()

      // Fetch tables
      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .order('id')
      setTables(tableData || [])

      // Fetch menu_items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .order('category_id')
      setMenuItems(menuData || [])

      if (menuData && menuData.length > 0 && !selectedMenuId) {
        setSelectedMenuId(menuData[0].id)
      }

      // Fetch option_groups
      const { data: groupData } = await supabase
        .from('option_groups')
        .select('*')
        .order('name')
      setOptionGroups(groupData || [])

      // Fetch options
      const { data: optionData } = await supabase
        .from('options')
        .select('*')
        .order('name')
      setOptionsList(optionData || [])

      // Fetch orders
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, payments(*)')
        .order('created_at', { ascending: false })
      setOrders(orderData || [])
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTableId || !newTableName) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tables')
        .insert({ id: newTableId.toUpperCase(), name: newTableName, is_active: true })

      if (error) throw error

      setNewTableId('')
      setNewTableName('')
      fetchData()
    } catch (err: any) {
      console.error('Add table error:', err)
      alert(err.message || 'ไม่สามารถเพิ่มโต๊ะได้')
    }
  }

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName || !newItemPrice) return
    const id = newItemId.trim() || `item-${Date.now()}`
    const actualCategory = newItemCategory === 'all' ? 'noodles' : newItemCategory
    
    setUploadingImage(true)
    try {
      const supabase = createClient()

      let uploadedImageUrl: string | null = null
      if (newItemImageFile) {
        const ext = newItemImageFile.name.split('.').pop() || 'jpg'
        const fileName = `menu-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        // Try uploading to menu-images bucket first
        let uploadRes = await supabase.storage.from('menu-images').upload(fileName, newItemImageFile)
        let bucketName = 'menu-images'

        // Fallback to slips bucket if menu-images bucket is not yet created
        if (uploadRes.error) {
          uploadRes = await supabase.storage.from('slips').upload(`menu-${fileName}`, newItemImageFile)
          bucketName = 'slips'
        }

        if (!uploadRes.error && uploadRes.data) {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(uploadRes.data.path)
          uploadedImageUrl = data.publicUrl
        }
      }

      // Default category fallback image if no file was uploaded
      if (!uploadedImageUrl) {
        if (actualCategory === 'noodles') uploadedImageUrl = '/food/nam-tok.png'
        else if (actualCategory === 'khaomangai') uploadedImageUrl = '/food/khao-man-gai.png'
        else if (actualCategory === 'drinks') uploadedImageUrl = '/food/cha-thai.png'
        else uploadedImageUrl = '/food/nam-tok.png'
      }

      const { error } = await supabase.from('menu_items').insert({
        id,
        name: newItemName,
        category_id: actualCategory,
        price: parseFloat(newItemPrice),
        image_url: uploadedImageUrl,
        is_available: true,
      })

      if (error) throw error

      setNewItemId('')
      setNewItemName('')
      setNewItemPrice('')
      setNewItemImageFile(null)
      setNewItemImagePreview('')
      fetchData()
    } catch (err: any) {
      console.error('Add menu item error:', err)
      alert(err.message || 'ไม่สามารถเพิ่มเมนูอาหารได้')
    } finally {
      setUploadingImage(false)
    }
  }

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // 1-Click Inline Image Update for existing menu items
  const handleUpdateItemImage = async (itemId: string, file: File) => {
    setUpdatingItemId(itemId)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `menu-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      // Try uploading to menu-images bucket first
      let uploadRes = await supabase.storage.from('menu-images').upload(fileName, file)
      let bucketName = 'menu-images'

      // Fallback to slips bucket if menu-images bucket is not yet created
      if (uploadRes.error) {
        uploadRes = await supabase.storage.from('slips').upload(`menu-${fileName}`, file)
        bucketName = 'slips'
      }

      if (uploadRes.error) throw uploadRes.error

      const { data } = supabase.storage.from(bucketName).getPublicUrl(uploadRes.data.path)
      const newImageUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ image_url: newImageUrl })
        .eq('id', itemId)

      if (updateError) throw updateError

      fetchData()
    } catch (err: any) {
      console.error('Update item image error:', err)
      alert(err.message || 'ไม่สามารถอัปเดตรูปภาพได้')
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm(`ต้องการลบเมนูนี้ใช่หรือไม่?`)) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Delete menu item error:', err)
    }
  }

  const handleAddOptionGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMenuId || !newGroupName) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('option_groups').insert({
        menu_item_id: selectedMenuId,
        name: newGroupName,
        is_required: newGroupRequired,
      })

      if (error) throw error

      setNewGroupName('')
      setNewGroupRequired(false)
      fetchData()
    } catch (err: any) {
      console.error('Add option group error:', err)
      alert(err.message || 'ไม่สามารถเพิ่มกลุ่มตัวเลือกได้')
    }
  }

  const handleDeleteOptionGroup = async (id: string) => {
    if (!confirm('ต้องการลบกลุ่มตัวเลือกนี้ใช่หรือไม่? (ตัวเลือกย่อยทั้งหมดจะถูกลบไปด้วย)')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('option_groups').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Delete group error:', err)
    }
  }

  // 1-Click Apply Preset Template (Replaces old options cleanly)
  const handleApplyPreset = async (presetType: 'noodle' | 'rice' | 'drink' | 'extras_only') => {
    if (!selectedMenuId) {
      alert('กรุณาเลือกเมนูก่อนใส่แม่แบบ')
      return
    }
    if (!confirm('ต้องการเปลี่ยนตัวเลือกของเมนูนี้เป็นชุดแม่แบบที่เลือกใช่หรือไม่? (ระบบจะล้างตัวเลือกเดิมของเมนูนี้ออกก่อน)')) return

    try {
      const supabase = createClient()

      // 🛡️ Delete existing groups for this menu first to prevent duplicates!
      await supabase.from('option_groups').delete().eq('menu_item_id', selectedMenuId)

      let groupsToCreate: { name: string; is_required: boolean; options: { name: string; price: number }[] }[] = []

      if (presetType === 'noodle') {
        groupsToCreate = [
          {
            name: 'เลือกเส้น',
            is_required: true,
            options: [
              { name: 'เส้นเล็ก', price: 0 },
              { name: 'เส้นใหญ่', price: 0 },
              { name: 'บะหมี่เหลือง', price: 0 },
              { name: 'วุ้นเส้น', price: 0 },
              { name: 'เส้นหมี่ขาว', price: 0 },
              { name: 'มาม่า', price: 0 },
              { name: 'เกาเหลา (ไม่เอาเส้น)', price: 0 },
            ],
          },
          {
            name: 'รูปแบบ',
            is_required: true,
            options: [
              { name: 'น้ำ', price: 0 },
              { name: 'แห้ง', price: 0 },
            ],
          },
          {
            name: 'เลือกผัก',
            is_required: false,
            options: [
              { name: 'ใส่ผักปกติ', price: 0 },
              { name: 'ถั่วงอก', price: 0 },
              { name: 'ผักบุ้ง', price: 0 },
              { name: 'ไม่ใส่ผัก', price: 0 },
            ],
          },
          {
            name: 'เพิ่มของได้ตามใจ',
            is_required: false,
            options: [
              { name: 'ไข่ต้ม', price: 7 },
              { name: 'ลูกชิ้นหมู (5 ลูก)', price: 20 },
              { name: 'ลูกชิ้นเนื้อ (5 ลูก)', price: 20 },
              { name: 'ข้าวเปล่า', price: 5 },
            ],
          },
        ]
      } else if (presetType === 'rice') {
        groupsToCreate = [
          {
            name: 'ขนาดจาน',
            is_required: true,
            options: [
              { name: 'ธรรมดา', price: 0 },
              { name: 'พิเศษ (+10฿)', price: 10 },
            ],
          },
          {
            name: 'เนื้อไก่',
            is_required: false,
            options: [
              { name: 'เนื้อผสมหนัง (ปกติ)', price: 0 },
              { name: 'ไม่เอาหนัง (เนื้อล้วน)', price: 0 },
              { name: 'เน้นหนัง', price: 0 },
            ],
          },
          {
            name: 'เครื่องเคียงเพิ่ม',
            is_required: false,
            options: [
              { name: 'เพิ่มตับไก่ (+10฿)', price: 10 },
              { name: 'เพิ่มข้าวมัน (+10฿)', price: 10 },
              { name: 'ไข่ต้มยางมะตูม (+7฿)', price: 7 },
              { name: 'น้ำซุปมะนาวดอง (+0฿)', price: 0 },
            ],
          },
        ]
      } else if (presetType === 'drink') {
        groupsToCreate = [
          {
            name: 'ขนาดแก้ว',
            is_required: true,
            options: [
              { name: 'แก้วเล็ก (25฿)', price: 0 },
              { name: 'แก้วใหญ่ (35฿)', price: 10 },
            ],
          },
          {
            name: 'ระดับความหวาน',
            is_required: true,
            options: [
              { name: 'หวานปกติ (100%)', price: 0 },
              { name: 'หวานน้อย (50%)', price: 0 },
              { name: 'ไม่หวานเลย (0%)', price: 0 },
            ],
          },
          {
            name: 'ปริมาณน้ำแข็ง',
            is_required: false,
            options: [
              { name: 'น้ำแข็งปกติ', price: 0 },
              { name: 'น้ำแข็งน้อย', price: 0 },
              { name: 'ไม่ใส่น้ำแข็ง', price: 0 },
            ],
          },
        ]
      } else if (presetType === 'extras_only') {
        groupsToCreate = [
          {
            name: 'เพิ่มของได้ตามใจ',
            is_required: false,
            options: [
              { name: 'ไข่ต้ม', price: 7 },
              { name: 'ลูกชิ้นหมู (5 ลูก)', price: 20 },
              { name: 'ลูกชิ้นเนื้อ (5 ลูก)', price: 20 },
              { name: 'ข้าวเปล่า', price: 5 },
            ],
          },
        ]
      }

      for (const grp of groupsToCreate) {
        const { data: groupData, error: gErr } = await supabase
          .from('option_groups')
          .insert({
            menu_item_id: selectedMenuId,
            name: grp.name,
            is_required: grp.is_required,
          })
          .select()
          .single()

        if (gErr) throw gErr

        if (groupData && grp.options.length > 0) {
          const optionsRows = grp.options.map((opt) => ({
            group_id: groupData.id,
            name: opt.name,
            extra_price: opt.price,
          }))

          const { error: oErr } = await supabase.from('options').insert(optionsRows)
          if (oErr) throw oErr
        }
      }

      fetchData()
    } catch (err: any) {
      console.error('Apply preset error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการใส่ชุดตัวเลือกแม่แบบ')
    }
  }

  // Copy options from another menu (Replaces cleanly)
  const handleCopyFromMenu = async (sourceMenuId: string) => {
    if (!sourceMenuId || !selectedMenuId || sourceMenuId === selectedMenuId) return
    if (!confirm('ต้องการคัดลอกตัวเลือกทั้งหมดจากเมนูที่เลือกมาแทนที่เมนูนี้ใช่หรือไม่?')) return

    try {
      const supabase = createClient()
      const sourceGroups = optionGroups.filter((g) => g.menu_item_id === sourceMenuId)
      if (sourceGroups.length === 0) {
        alert('เมนูต้นทางไม่มีตัวเลือกให้คัดลอก')
        return
      }

      // 🛡️ Delete existing groups for this menu first!
      await supabase.from('option_groups').delete().eq('menu_item_id', selectedMenuId)

      for (const grp of sourceGroups) {
        const { data: newGrp, error: gErr } = await supabase
          .from('option_groups')
          .insert({
            menu_item_id: selectedMenuId,
            name: grp.name,
            is_required: grp.is_required,
          })
          .select()
          .single()

        if (gErr) throw gErr

        const srcOptions = optionsList.filter((o) => o.group_id === grp.id)
        if (newGrp && srcOptions.length > 0) {
          const optRows = srcOptions.map((o) => ({
            group_id: newGrp.id,
            name: o.name,
            extra_price: o.extra_price,
          }))
          const { error: oErr } = await supabase.from('options').insert(optRows)
          if (oErr) throw oErr
        }
      }

      fetchData()
    } catch (err: any) {
      console.error('Copy options error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการคัดลอกตัวเลือก')
    }
  }

  // Clear all options for selected menu
  const handleClearAllOptionsForMenu = async () => {
    if (!selectedMenuId) return
    if (!confirm('ต้องการล้างตัวเลือกทั้งหมดของเมนูนี้ออกทั้งหมดใช่หรือไม่?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('option_groups').delete().eq('menu_item_id', selectedMenuId)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Clear options error:', err)
      alert(err.message || 'เกิดข้อผิดพลาดในการล้างตัวเลือก')
    }
  }

  const handleAddOptionInline = async (groupId: string) => {
    const name = inlineOptionNames[groupId]?.trim()
    if (!name) return
    const extra_price = parseFloat(inlineOptionPrices[groupId] || '0')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('options').insert({
        group_id: groupId,
        name,
        extra_price,
      })

      if (error) throw error

      setInlineOptionNames((prev) => ({ ...prev, [groupId]: '' }))
      setInlineOptionPrices((prev) => ({ ...prev, [groupId]: '0' }))
      fetchData()
    } catch (err: any) {
      console.error('Add option error:', err)
      alert(err.message || 'ไม่สามารถเพิ่มตัวเลือกย่อยได้')
    }
  }

  const handleDeleteOption = async (id: string) => {
    if (!confirm('ต้องการลบตัวเลือกย่อยนี้ใช่หรือไม่?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('options').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Delete option error:', err)
    }
  }

  const toggleTableActive = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tables')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Toggle table error:', err)
    }
  }

  const toggleMenuAvailable = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Toggle menu error:', err)
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (!confirm(`ต้องการลบโต๊ะ ${id} ใช่หรือไม่?`)) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('tables').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Delete table error:', err)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)

      if (error) throw error
      fetchData()
    } catch (err: any) {
      console.error('Update order status error:', err)
    }
  }

  // Filter orders by filterRange
  const filteredOrders = orders.filter((o) => {
    const orderDate = new Date(o.created_at)
    const now = new Date()

    if (filterRange === 'today') {
      return orderDate.toDateString() === now.toDateString()
    }
    if (filterRange === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return orderDate.toDateString() === yesterday.toDateString()
    }
    if (filterRange === 'week') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return orderDate >= sevenDaysAgo
    }
    if (filterRange === 'month') {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      )
    }
    if (filterRange === 'custom') {
      if (!selectedCustomDate) return true
      const y = orderDate.getFullYear()
      const m = String(orderDate.getMonth() + 1).padStart(2, '0')
      const d = String(orderDate.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}` === selectedCustomDate
    }
    return true // 'all'
  })

  const getFilterLabel = () => {
    if (filterRange === 'today') return 'ยอดขายประจำวันนี้'
    if (filterRange === 'yesterday') return 'ยอดขายประจำเมื่อวาน'
    if (filterRange === 'week') return 'ยอดขายสะสม 7 วันล่าสุด'
    if (filterRange === 'month') return 'ยอดขายสะสมประจำเดือนนี้'
    if (filterRange === 'custom')
      return selectedCustomDate
        ? `ยอดขายประจำวันที่ ${new Date(selectedCustomDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : 'ยอดขายตามวันที่กำหนด'
    return 'ยอดขายรวมทุกวัน (ทั้งหมด)'
  }

  const isTransferOrder = (o: Order) => {
    if (o.payments?.some((p) => !!p.slip_url)) return true
    if (o.payment_method === 'cash') return false
    const payment = o.payments?.[0]
    if (payment?.payment_method === 'cash' || payment?.method === 'cash') return false
    if (o.payment_method === 'promptpay') return true
    if (payment?.payment_method === 'promptpay' || payment?.method === 'promptpay') return true
    return true
  }

  const isOrderPaid = (o: Order) => {
    return (
      o.status === 'paid' ||
      o.payments?.some((p) => p.status === 'paid' || p.status === 'submitted' || !!p.slip_url)
    )
  }

  const selectedTransferRevenue = filteredOrders
    .filter((o) => isOrderPaid(o) && isTransferOrder(o))
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const selectedCashRevenue = filteredOrders
    .filter((o) => isOrderPaid(o) && !isTransferOrder(o))
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const selectedTotalRevenue = selectedTransferRevenue + selectedCashRevenue

  const selectedOrdersCount = filteredOrders.filter((o) => isOrderPaid(o)).length

  // Revenue chart data (7 days)
  const chartDataMap: Record<string, number> = {}
  orders.forEach((o) => {
    const dateKey = new Date(o.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
    chartDataMap[dateKey] = (chartDataMap[dateKey] || 0) + (o.total || 0)
  })
  const revenueChartData = Object.keys(chartDataMap).map((key) => ({
    date: key,
    total: chartDataMap[key],
  })).slice(-7)

  // Current groups for selected menu item (Deduplicated by name to prevent duplicate cards)
  const rawMenuGroups = optionGroups.filter((g) => g.menu_item_id === selectedMenuId)
  const currentMenuGroups = rawMenuGroups.filter((grp, idx, self) => self.findIndex((t) => t.name === grp.name) === idx)

  // Filtered menu items based on selected category in form (Zero-clutter automatic filter)
  const filteredMenuItems = newItemCategory === 'all' ? menuItems : menuItems.filter((i) => i.category_id === newItemCategory)

  return (
    <main className="min-h-dvh bg-background p-4 sm:p-6 pb-20">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">ระบบผู้ดูแลร้าน (Admin Dashboard)</h1>
            <p className="text-xs text-muted-foreground">สรุปยอดขาย จัดการสินค้า ปรับแต่งตัวเลือกอาหาร และ Recharts Analytics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* POS Quick Order Button */}
          <button
            type="button"
            onClick={() => setPosModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>➕ สั่งอาหารหน้าร้าน (POS)</span>
          </button>

          {/* Store Open/Closed Toggle */}
          <button
            type="button"
            onClick={handleToggleStoreOpen}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isStoreOpen
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/25'
                : 'bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
            <span>{isStoreOpen ? '🟢 ร้านเปิดรับออเดอร์' : '🔴 ร้านปิดรับออเดอร์'}</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/staff')}
            className="flex items-center gap-1 rounded-full bg-secondary px-3.5 py-2 text-xs font-semibold text-secondary-foreground"
          >
            หน้า Staff <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
          >
            <LogOut className="h-3.5 w-3.5" /> ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Tab Navigation Bar */}
      <nav className="mx-auto mt-6 flex max-w-6xl items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-xs cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-card text-muted-foreground border border-border hover:bg-secondary hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>📊 สรุปยอดขาย &amp; ออเดอร์</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-xs cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-card text-muted-foreground border border-border hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Utensils className="h-4 w-4" />
          <span>🍜 จัดการเมนู &amp; ตัวเลือก ({menuItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-xs cursor-pointer ${
            activeTab === 'tables'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-card text-muted-foreground border border-border hover:bg-secondary hover:text-foreground'
          }`}
        >
          <TableIcon className="h-4 w-4" />
          <span>🪑 จัดการโต๊ะ &amp; QR ({tables.length})</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 📊 TAB 1: OVERVIEW & SALES ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Filter Selector Bar */}
          <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-sm font-bold text-card-foreground">
                  {getFilterLabel()}
                </h2>
                <p className="text-[11px] text-muted-foreground">สลับดูยอดรวม เงินโอน เงินสด และประวัติออเดอร์ตามช่วงเวลาได้</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterRange('today')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filterRange === 'today'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setFilterRange('yesterday')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filterRange === 'yesterday'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                เมื่อวาน
              </button>
              <button
                type="button"
                onClick={() => setFilterRange('week')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filterRange === 'week'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => setFilterRange('month')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filterRange === 'month'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => setFilterRange('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  filterRange === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                ดูทั้งหมด
              </button>
              <input
                type="date"
                value={selectedCustomDate}
                onChange={(e) => {
                  setSelectedCustomDate(e.target.value)
                  setFilterRange('custom')
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer transition-colors ${
                  filterRange === 'custom'
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border bg-secondary text-secondary-foreground'
                }`}
              />
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">ยอดขายรวม</p>
                <p className="font-display text-2xl font-bold text-primary">{selectedTotalRevenue} บาท</p>
                <p className="text-[10px] text-muted-foreground">โอน {selectedTransferRevenue}฿ | สด {selectedCashRevenue}฿</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">ยอดเงินโอน (PromptPay)</p>
                <p className="font-display text-2xl font-bold text-teal-600">{selectedTransferRevenue} บาท</p>
                <p className="text-[10px] text-muted-foreground">สแกนแนบสลิปเรียบร้อย</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">ยอดเงินสด</p>
                <p className="font-display text-2xl font-bold text-blue-600">{selectedCashRevenue} บาท</p>
                <p className="text-[10px] text-muted-foreground">รับเงินสดหน้าร้าน</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">จำนวนบิลทั้งหมด</p>
                <p className="font-display text-2xl font-bold text-card-foreground">{selectedOrdersCount} ออเดอร์</p>
                <p className="text-[10px] text-muted-foreground">เฉลี่ยบิลละ {selectedOrdersCount > 0 ? Math.round(selectedTotalRevenue / selectedOrdersCount) : 0} บาท</p>
              </div>
            </div>
          </div>

          {/* Recharts Revenue Bar Chart */}
          <div className="mx-auto max-w-6xl">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold text-card-foreground">กราฟสรุปรายได้ (7 วันย้อนหลัง)</h2>
                </div>
              </div>
              <div className="mt-4 h-64 w-full">
                {revenueChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    ยังไม่มีข้อมูลยอดขาย
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <XAxis dataKey="date" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} />
                      <Tooltip formatter={(value: any) => [`${value ?? 0} บาท`, 'ยอดขาย']} />
                      <Bar dataKey="total" fill="var(--color-primary, #b91c1c)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          {/* Recent Orders Table */}
          <section className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-xs">
            <h2 className="border-b border-border pb-3 font-display text-lg font-bold text-card-foreground">
              ประวัติคำสั่งซื้อ: {getFilterLabel()} ({filteredOrders.length} รายการ)
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2">โต๊ะ</th>
                    <th className="pb-2">เวลา</th>
                    <th className="pb-2">ยอดเงิน</th>
                    <th className="pb-2">สถานะ</th>
                    <th className="pb-2">วิธีชำระ</th>
                    <th className="pb-2 text-right">สลิป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground italic">
                        ไม่มีประวัติคำสั่งซื้อสำหรับวันที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const slipUrl = o.payments?.[0]?.slip_url
                      const isPaid = isOrderPaid(o)
                      const isTransfer = isTransferOrder(o)
                      return (
                        <tr key={o.id} className="hover:bg-secondary/40">
                          <td className="py-2.5 font-semibold text-card-foreground">
                            โต๊ะ {o.table_id} <span className="ml-1 text-[11px] font-mono text-muted-foreground">(#{o.id.slice(0, 8).toUpperCase()})</span>
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 font-bold text-primary">{o.total}฿</td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-500/15 text-emerald-700'
                                  : o.status === 'served'
                                  ? 'bg-purple-500/15 text-purple-700'
                                  : o.status === 'preparing'
                                  ? 'bg-blue-500/15 text-blue-700'
                                  : 'bg-amber-500/15 text-amber-700'
                              }`}
                            >
                              {isPaid
                                ? '✓ ชำระแล้ว'
                                : o.status === 'served'
                                ? '🍲 เสิร์ฟแล้ว'
                                : o.status === 'preparing'
                                ? '🍳 กำลังทำ'
                                : '⏳ รอรับออเดอร์'}
                            </span>
                          </td>
                          <td className="py-2.5">
                            {isTransfer ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                                📱 โอนเงิน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                💵 เงินสด
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            {slipUrl ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSlip(slipUrl)}
                                className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                              >
                                <Eye className="h-3 w-3" /> สลิป
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🍜 TAB 2: MENU ITEMS & OPTIONS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Manage Menu Items (Full Width Card) */}
          <section className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Utensils className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-bold text-card-foreground">จัดการเมนูอาหาร (Menu Items)</h2>
                <p className="text-xs text-muted-foreground">เพิ่มเมนูใหม่ อัปโหลดรูปภาพ ปรับราคา และเปิด/ปิดสถานะสินค้าหมด</p>
              </div>
            </div>

            <form onSubmit={handleAddMenuItem} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="รหัสเมนู (เช่น tom-yum-2 หรือปล่อยว่างเพื่อสุ่ม)"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="ชื่อสินค้า (เช่น ก๋วยเตี๋ยวต้มยำพิเศษ)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="noodles">🍜 เมนูเส้น (noodles)</option>
                  <option value="khaomangai">🍚 เมนูข้าวมันไก่ (khaomangai)</option>
                  <option value="drinks">🥤 เครื่องดื่ม (drinks)</option>
                  <option value="all">📂 แสดงทุกหมวดหมู่ (ดูทั้งหมด)</option>
                </select>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  placeholder="ราคา (บาท)"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* 📷 Image Upload from Device with Instant Preview */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5 text-primary" /> รูปภาพเมนูอาหาร (เลือกรูปจากมือถือหรือคอม):
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
                    <UploadCloud className="h-4 w-4" />
                    <span>{newItemImageFile ? `รูปที่เลือก: ${newItemImageFile.name}` : '📷 คลิกเพื่อเลือกรูปภาพจากเครื่อง'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setNewItemImageFile(file)
                          setNewItemImagePreview(URL.createObjectURL(file))
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {newItemImagePreview && (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={newItemImagePreview} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemImageFile(null)
                          setNewItemImagePreview('')
                        }}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 cursor-pointer"
                        title="ลบรูปที่เลือก"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={uploadingImage}
                className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> {uploadingImage ? '⏳ กำลังอัปโหลดรูปภาพและบันทึก...' : 'เพิ่มสินค้าลงในเมนู'}
              </button>
            </form>

            {/* Active Category Filter Header & Count */}
            <div className="mt-6 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs font-bold text-card-foreground flex items-center gap-1.5">
                <span>📋 รายการในหมวด:</span>
                <span className="text-primary font-display font-bold">
                  {newItemCategory === 'noodles' && '🍜 เมนูเส้น'}
                  {newItemCategory === 'khaomangai' && '🍚 เมนูข้าวมันไก่'}
                  {newItemCategory === 'drinks' && '🥤 เครื่องดื่ม'}
                  {newItemCategory === 'all' && '📂 ทุกหมวดหมู่'}
                </span>
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] text-muted-foreground font-semibold">
                {filteredMenuItems.length} รายการ
              </span>
            </div>

            <ul className="mt-2 divide-y divide-border overflow-y-auto max-h-80">
              {filteredMenuItems.length === 0 ? (
                <li className="py-6 text-center text-xs text-muted-foreground italic">
                  ยังไม่มีเมนูในหมวดนี้ สามารถพิมพ์ชื่อและราคาเพื่อเพิ่มได้จากฟอร์มด้านบน
                </li>
              ) : (
                filteredMenuItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Interactive Thumbnail: Click/Tap to change image directly! */}
                      <label
                        className="relative group h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-secondary shadow-2xs"
                        title="📷 คลิกหรือแตะที่รูปเพื่อเปลี่ยนรูปภาพอาหารนี้"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url || (item.category_id === 'noodles' ? '/food/nam-tok.png' : item.category_id === 'khaomangai' ? '/food/khao-man-gai.png' : '/food/cha-thai.png')}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                          <Camera className="h-3.5 w-3.5 drop-shadow-xs" />
                          <span className="text-[7px] font-bold">เปลี่ยนรูป</span>
                        </div>
                        {updatingItemId === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={updatingItemId === item.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleUpdateItemImage(item.id, file)
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <div className="truncate">
                        <p className="font-semibold text-card-foreground truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          หมวด: {item.category_id === 'noodles' ? 'ก๋วยเตี๋ยว' : item.category_id === 'khaomangai' ? 'ข้าวมันไก่' : 'เครื่องดื่ม'} · {item.price} บาท
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleMenuAvailable(item.id, item.is_available)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                          item.is_available ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25' : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                        }`}
                      >
                        {item.is_available ? 'พร้อมขาย' : 'สินค้าหมด'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                        title="ลบเมนูนี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* UNIFIED MENU OPTIONS MANAGEMENT (Intuitive Single Card View) */}
          <section className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="font-display text-xl font-bold text-card-foreground">จัดการตัวเลือกปรับแต่งอาหาร (Menu Options)</h2>
                  <p className="text-xs text-muted-foreground">เลือกเมนู แล้วเพิ่มกลุ่มตัวเลือกหรือกดใส่ชุดสำเร็จรูปได้ทันที</p>
                </div>
              </div>

              {/* Menu Selector Dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">เลือกเมนู:</label>
                <select
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary focus:outline-none"
                >
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id})
                    </option>
                  ))}
                </select>
                {currentMenuGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllOptionsForMenu}
                    className="inline-flex items-center gap-1 rounded-2xl bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    title="ล้างตัวเลือกทั้งหมดของเมนูนี้ออก"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> ล้างตัวเลือกทั้งหมด
                  </button>
                )}
              </div>
            </div>

            {/* ⚡ 1-CLICK PRESET TEMPLATES & COPY ACTION BAR */}
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    ⚡ ใส่ชุดตัวเลือกสำเร็จรูปใน 1 คลิก (ไม่ต้องพิมพ์เอง):
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('noodle')}
                      className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
                      title="ใส่ชุด: เลือกเส้น, เลือกน้ำ, เนื้อสัตว์, ผัก, ท็อปปิ้ง"
                    >
                      🍜 แม่แบบก๋วยเตี๋ยวครบชุด
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('rice')}
                      className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition-colors cursor-pointer"
                      title="ใส่ชุด: ขนาดจาน, ประเภทไก่, เครื่องเคียง"
                    >
                      🍚 แม่แบบเมนูข้าว/จานเดียว
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('drink')}
                      className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition-colors cursor-pointer"
                      title="ใส่ชุด: ระดับความหวาน, น้ำแข็ง"
                    >
                      🥤 แม่แบบเครื่องดื่ม/ชานม
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('extras_only')}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
                      title="ใส่เฉพาะกลุ่ม: เพิ่มของได้ตามใจ (ไข่ต้ม, ลูกชิ้น, ข้าวเปล่า)"
                    >
                      🥓 +เฉพาะกลุ่ม "เพิ่มของได้ตามใจ"
                    </button>
                  </div>
                </div>

                {/* Copy from existing menu */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-500/20">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">📋 คัดลอกจาก:</span>
                  <select
                    value={copySourceMenuId}
                    onChange={(e) => setCopySourceMenuId(e.target.value)}
                    className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">-- เลือกเมนูต้นทาง --</option>
                    {menuItems
                      .filter((m) => m.id !== selectedMenuId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleCopyFromMenu(copySourceMenuId)}
                    disabled={!copySourceMenuId}
                    className="rounded-xl bg-secondary border border-border px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 cursor-pointer"
                  >
                    คัดลอกมาใส่เมนูนี้
                  </button>
                </div>
              </div>
            </div>

            {/* Display Group Cards for selectedMenuId */}
            <div className="mt-6 space-y-6">
              {currentMenuGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">ยังไม่มีกลุ่มตัวเลือกสำหรับเมนูนี้</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    กดเลือก <strong>"⚡ ใส่ชุดตัวเลือกสำเร็จรูป"</strong> ด้านบน หรือสร้างกลุ่มตัวเลือกเองจากฟอร์มด้านล่าง
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {currentMenuGroups.map((group) => {
                    const groupOptions = optionsList.filter((o) => o.group_id === group.id)
                    return (
                      <div key={group.id} className="flex flex-col justify-between rounded-2xl border border-border bg-background p-4 shadow-xs">
                        <div>
                          {/* Group Header */}
                          <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-base font-bold text-card-foreground">{group.name}</h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  group.is_required ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                                }`}
                              >
                                {group.is_required ? 'บังคับเลือก' : 'เลือกหรือไม่ก็ได้'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteOptionGroup(group.id)}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              title="ลบกลุ่มตัวเลือกนี้"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Options List */}
                          <ul className="mt-3 divide-y divide-border/60">
                            {groupOptions.length === 0 ? (
                              <li className="py-2 text-center text-xs text-muted-foreground italic">ยังไม่มีตัวเลือกย่อย</li>
                            ) : (
                              groupOptions.map((opt) => (
                                <li key={opt.id} className="flex items-center justify-between py-2 text-xs">
                                  <span className="text-card-foreground">· {opt.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-primary">
                                      {opt.extra_price > 0 ? `+${opt.extra_price}฿` : '+0฿'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOption(opt.id)}
                                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                                      title="ลบตัวเลือกนี้"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>

                        {/* Inline Add Option Form */}
                        <div className="mt-4 border-t border-border/80 pt-3">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            + เพิ่มตัวเลือกย่อยเข้ากลุ่ม "{group.name}":
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="ชื่อตัวเลือก (เช่น เส้นเล็ก / ไข่ต้ม)"
                              value={inlineOptionNames[group.id] || ''}
                              onChange={(e) =>
                                setInlineOptionNames((prev) => ({ ...prev, [group.id]: e.target.value }))
                              }
                              className="flex-1 rounded-xl border border-border bg-card p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={inlineOptionPrices[group.id] || ''}
                              onChange={(e) =>
                                setInlineOptionPrices((prev) => ({ ...prev, [group.id]: e.target.value }))
                              }
                              className="w-16 rounded-xl border border-border bg-card p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddOptionInline(group.id)}
                              className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Custom Create Option Group Form */}
            <div className="mt-8 rounded-2xl border border-border bg-secondary/20 p-4">
              <h4 className="font-display text-xs font-bold text-card-foreground">
                ➕ หรือสร้างกลุ่มตัวเลือกแบบกำหนดเอง (Custom Group):
              </h4>

              {/* Quick Chip Suggestions */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">คำแนะนำด่วน:</span>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('เลือกเส้น'); setNewGroupRequired(true) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🍜 เลือกเส้น
                </button>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('เลือกน้ำซุป'); setNewGroupRequired(true) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🍲 เลือกน้ำซุป
                </button>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('เลือกเนื้อสัตว์'); setNewGroupRequired(true) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🥩 เลือกเนื้อสัตว์
                </button>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('ระดับความเผ็ด'); setNewGroupRequired(false) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🌶️ ระดับความเผ็ด
                </button>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('เพิ่มของได้ตามใจ'); setNewGroupRequired(false) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🥓 เพิ่มของได้ตามใจ
                </button>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('ระดับความหวาน'); setNewGroupRequired(true) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🍯 ระดับความหวาน
                </button>
                <button
                  type="button"
                  onClick={() => { setNewGroupName('ปริมาณน้ำแข็ง'); setNewGroupRequired(true) }}
                  className="rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-medium text-card-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  🧊 ปริมาณน้ำแข็ง
                </button>
              </div>

              <form onSubmit={handleAddOptionGroup} className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
                  <input
                    type="text"
                    required
                    placeholder="ชื่อกลุ่มใหม่ เช่น เลือกเส้น / ท็อปปิ้งเพิ่ม"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="rounded-xl border border-border bg-card p-2.5 text-xs text-foreground focus:border-primary focus:outline-none sm:col-span-2"
                  />
                  <label className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newGroupRequired}
                      onChange={(e) => setNewGroupRequired(e.target.checked)}
                      className="accent-primary"
                    />
                    <span>จำเป็นต้องเลือก (is_required)</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> สร้างกลุ่มตัวเลือกสำหรับเมนูนี้
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🪑 TAB 3: TABLES & QR CODE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Quick Print QR Hero Banner */}
          <div className="mx-auto max-w-6xl rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <QrCode className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-card-foreground">ใบพิมพ์ QR Code สำหรับติดโต๊ะอาหาร</h3>
                <p className="text-xs text-muted-foreground">พิมพ์ป้ายตั้งโต๊ะขนาดมาตรฐาน A6 ครบทุกโต๊ะ (T1 - T{tables.length}) พร้อมข้อความแนะนำวิธีสแกนสั่ง</p>
              </div>
            </div>
            <a
              href="/admin/print-qr"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <QrCode className="h-4 w-4" /> 🖨️ เปิดหน้าพิมพ์ป้าย QR ทุกโต๊ะ
            </a>
          </div>

          {/* Manage Tables Section */}
          <section className="mx-auto max-w-6xl rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-card-foreground">จัดการโต๊ะอาหาร ({tables.length} โต๊ะ)</h2>
              </div>
            </div>

            <form onSubmit={handleAddTable} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="รหัส เช่น T11"
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="ชื่อ เช่น โต๊ะ 11"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" /> เพิ่มโต๊ะอาหาร
              </button>
            </form>

            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {tables.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background text-xs shadow-2xs">
                  <div>
                    <span className="font-bold text-card-foreground">{t.name} ({t.id})</span>
                    <a
                      href={`/table/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                    >
                      <QrCode className="h-3 w-3" /> เปิดหน้าสั่ง
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTableActive(t.id, t.is_active)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                        t.is_active ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25' : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                      }`}
                    >
                      {t.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTable(t.id)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                      title="ลบโต๊ะนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* Slip Modal View */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setSelectedSlip(null)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10 max-h-[85vh] w-full max-w-sm rounded-3xl bg-card p-4 shadow-2xl">
            <button type="button" onClick={() => setSelectedSlip(null)} className="absolute right-3 top-3 rounded-full bg-secondary p-1.5">
              ✕
            </button>
            <h3 className="mb-3 font-display text-base font-bold text-card-foreground">สลิปการโอนเงิน</h3>
            <img src={selectedSlip} alt="Slip" className="mx-auto max-h-[70vh] rounded-2xl object-contain" />
          </div>
        </div>
      )}
      {/* 🛍️ POS QUICK ORDER MODAL FOR ADMIN */}
      {posModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setPosModalOpen(false)}
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          />
          <div className="relative z-10 flex flex-col max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-2xl border border-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-card-foreground">รับออเดอร์หน้าร้าน (POS Mode)</h3>
                  <p className="text-[11px] text-muted-foreground">สำหรับลูกค้าที่สั่งกับแม่ค้าโดยตรง หรือ สั่งกลับบ้าน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Select Table / Takeaway */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">📍 เลือกโต๊ะ หรือ สั่งกลับบ้าน:</label>
                <div className="flex flex-wrap gap-1.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPosTableId(t)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        posTableId === t
                          ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      โต๊ะ {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPosTableId('takeaway')}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      posTableId === 'takeaway'
                        ? 'bg-amber-500 text-white shadow-xs scale-105'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    🛍️ ใส่ถุงกลับบ้าน
                  </button>
                </div>
              </div>

              {/* Menu List */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">🍜 แตะเลือกเมนูเพื่อเพิ่มลงบิล:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {menuItems
                    .filter((m) => m.is_available)
                    .map((item) => {
                      const inCart = posCart.find((c) => c.menuItem.id === item.id)
                      return (
                        <div
                          key={item.id}
                          onClick={() => handlePosAddToCart(item)}
                          className={`flex items-center justify-between rounded-2xl border p-2.5 transition-all cursor-pointer active:scale-98 ${
                            inCart
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border bg-card hover:bg-secondary/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                                <Utensils className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-card-foreground">{item.name}</p>
                              <p className="text-xs font-bold text-primary">{item.price} บาท</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {inCart ? (
                              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground shadow-xs">
                                ×{inCart.qty}
                              </span>
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground">
                                <Plus className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Live Cart in Modal */}
              {posCart.length > 0 && (
                <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-card-foreground border-b border-border pb-1.5">
                    <span>📋 รายการที่เลือก ({posCart.reduce((sum, c) => sum + c.qty, 0)} รายการ)</span>
                    <button
                      type="button"
                      onClick={() => setPosCart([])}
                      className="text-muted-foreground hover:text-destructive text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> ล้างทั้งหมด
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {posCart.map((c) => (
                      <div key={c.menuItem.id} className="flex items-center justify-between text-xs">
                        <span className="truncate font-semibold text-card-foreground">
                          {c.menuItem.name} × {c.qty}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-primary">{c.menuItem.price * c.qty}฿</span>
                          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handlePosRemoveFromCart(c.menuItem.id)}
                              className="h-5 w-5 flex items-center justify-center rounded bg-card text-card-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-[11px] font-bold px-1">{c.qty}</span>
                            <button
                              type="button"
                              onClick={() => handlePosAddToCart(c.menuItem)}
                              className="h-5 w-5 flex items-center justify-center rounded bg-primary text-primary-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border p-4 bg-muted/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">ยอดรวมทั้งหมด</p>
                <p className="font-display text-xl font-bold text-primary">
                  {posCart.reduce((sum, c) => sum + c.menuItem.price * c.qty, 0)} บาท
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPosModalOpen(false)}
                  className="rounded-full bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground hover:bg-secondary/80"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={posCart.length === 0 || posSubmitting}
                  onClick={handlePosSubmitOrder}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {posSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> 🚀 ส่งเข้าห้องครัวทันที
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
