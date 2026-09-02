'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
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

type Order = {
  id: string
  table_id: string
  status: string
  total: number
  created_at: string
  payments?: { slip_url: string | null }[]
}

const COLORS = ['#eab308', '#3b82f6', '#a855f7', '#10b981']

export default function AdminPage() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [optionsList, setOptionsList] = useState<OptionItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  
  // New Table Form
  const [newTableId, setNewTableId] = useState('')
  const [newTableName, setNewTableName] = useState('')

  // New Menu Item Form
  const [newItemId, setNewItemId] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('guaytiew')
  const [newItemPrice, setNewItemPrice] = useState('')

  // New Option Group Form
  const [newGroupMenuItemId, setNewGroupMenuItemId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRequired, setNewGroupRequired] = useState(false)

  // New Option Item Form
  const [newOptionGroupId, setNewOptionGroupId] = useState('')
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionExtraPrice, setNewOptionExtraPrice] = useState('0')

  const [loading, setLoading] = useState(true)
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null)
  const router = useRouter()

  const fetchData = async () => {
    setLoading(true)
    try {
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

      // Fetch option_groups
      const { data: groupData } = await supabase
        .from('option_groups')
        .select('*')
        .order('name')
      setOptionGroups(groupData || [])
      if (groupData && groupData.length > 0 && !newOptionGroupId) {
        setNewOptionGroupId(groupData[0].id)
      }

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

      if (menuData && menuData.length > 0 && !newGroupMenuItemId) {
        setNewGroupMenuItemId(menuData[0].id)
      }
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
    try {
      const supabase = createClient()
      const { error } = await supabase.from('menu_items').insert({
        id,
        name: newItemName,
        category_id: newItemCategory,
        price: parseFloat(newItemPrice),
        is_available: true,
      })

      if (error) throw error

      setNewItemId('')
      setNewItemName('')
      setNewItemPrice('')
      fetchData()
    } catch (err: any) {
      console.error('Add menu item error:', err)
      alert(err.message || 'ไม่สามารถเพิ่มเมนูอาหารได้')
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
    if (!newGroupMenuItemId || !newGroupName) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('option_groups').insert({
        menu_item_id: newGroupMenuItemId,
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

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOptionGroupId || !newOptionName) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('options').insert({
        group_id: newOptionGroupId,
        name: newOptionName,
        extra_price: parseFloat(newOptionExtraPrice || '0'),
      })

      if (error) throw error

      setNewOptionName('')
      setNewOptionExtraPrice('0')
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

  const totalRevenue = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  const paidOrdersCount = orders.filter((o) => o.status === 'paid').length

  // Revenue chart data
  const chartDataMap: Record<string, number> = {}
  orders.forEach((o) => {
    if (o.status === 'paid') {
      const dateKey = new Date(o.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
      chartDataMap[dateKey] = (chartDataMap[dateKey] || 0) + (o.total || 0)
    }
  })
  const revenueChartData = Object.keys(chartDataMap).map((key) => ({
    date: key,
    total: chartDataMap[key],
  })).slice(-7)

  // Status breakdown chart data
  const statusPieData = [
    { name: 'รอรับออเดอร์', value: orders.filter((o) => o.status === 'pending').length },
    { name: 'กำลังทำ', value: orders.filter((o) => o.status === 'preparing').length },
    { name: 'เสิร์ฟแล้ว', value: orders.filter((o) => o.status === 'served').length },
    { name: 'ชำระแล้ว', value: orders.filter((o) => o.status === 'paid').length },
  ].filter((item) => item.value > 0)

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

        <div className="flex items-center gap-2">
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

      {/* Metrics Cards */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">ยอดขายรวม (เฉพาะที่ชำระแล้ว)</p>
            <p className="font-display text-2xl font-bold text-primary">{totalRevenue} บาท</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">ออเดอร์ทั้งหมด</p>
            <p className="font-display text-2xl font-bold text-card-foreground">{orders.length} รายการ</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">ออเดอร์ชำระเงินแล้ว</p>
            <p className="font-display text-2xl font-bold text-card-foreground">{paidOrdersCount} รายการ</p>
          </div>
        </div>
      </div>

      {/* Recharts Revenue & Status Charts */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold text-card-foreground">กราฟสรุปรายได้ (ยอดขายรวม)</h2>
            </div>
          </div>
          <div className="mt-4 h-64 w-full">
            {revenueChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                ยังไม่มีข้อมูลยอดขายที่ชำระแล้ว
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

        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs lg:col-span-1">
          <h2 className="border-b border-border pb-3 font-display text-lg font-bold text-card-foreground">สัดส่วนสถานะออเดอร์</h2>
          <div className="mt-4 h-64 w-full">
            {statusPieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                ยังไม่มีออเดอร์ในระบบ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                    {statusPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Table Management & Menu Item Management */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Manage Tables (is_active) */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <TableIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-card-foreground">จัดการโต๊ะและลิงก์ QR Code (/table/[id])</h2>
          </div>

          <form onSubmit={handleAddTable} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="รหัส เช่น T6"
                value={newTableId}
                onChange={(e) => setNewTableId(e.target.value)}
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="ชื่อ เช่น โต๊ะ 6"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4" /> เพิ่มโต๊ะอาหาร
            </button>
          </form>

          <ul className="mt-4 divide-y divide-border overflow-y-auto max-h-64">
            {tables.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <span className="font-semibold text-card-foreground">{t.name} ({t.id})</span>
                  <a
                    href={`/table/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <QrCode className="h-3 w-3" /> ลิงก์โต๊ะ
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTableActive(t.id, t.is_active)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      t.is_active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {t.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(t.id)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Manage Menu Items (Add & Available Toggle) */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Utensils className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-card-foreground">จัดการและเพิ่มเมนูสินค้าใหม่ (menu_items)</h2>
          </div>

          <form onSubmit={handleAddMenuItem} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="รหัสเมนู (เช่น tom-yum-2)"
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
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="guaytiew">ก๋วยเตี๋ยว (guaytiew)</option>
                <option value="khaomangai">ข้าว (khaomangai)</option>
                <option value="drinks">เครื่องดื่ม (drinks)</option>
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
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4" /> เพิ่มสินค้าลงในเมนู
            </button>
          </form>

          <ul className="mt-4 divide-y divide-border overflow-y-auto max-h-64">
            {menuItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <p className="font-semibold text-card-foreground">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">หมวดหมู่: {item.category_id} · {item.price} บาท</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMenuAvailable(item.id, item.is_available)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      item.is_available ? 'bg-emerald-500/15 text-emerald-700' : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {item.is_available ? 'พร้อมขาย' : 'สินค้าหมด'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMenuItem(item.id)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* MENU OPTIONS MANAGEMENT (Option Groups & Options) */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Manage Option Groups (option_groups) */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sliders className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-card-foreground">1. เพิ่มกลุ่มตัวเลือกปรับแต่ง (option_groups)</h2>
          </div>

          <form onSubmit={handleAddOptionGroup} className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">เลือกเมนูอาหารที่ต้องการเพิ่มกลุ่ม:</label>
              <select
                value={newGroupMenuItemId}
                onChange={(e) => setNewGroupMenuItemId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="ชื่อกลุ่ม เช่น เลือกเส้น / ระดับความเผ็ด"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <label className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 text-xs text-foreground cursor-pointer">
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
              className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4" /> สร้างกลุ่มตัวเลือกใหม่
            </button>
          </form>

          <ul className="mt-4 divide-y divide-border overflow-y-auto max-h-64">
            {optionGroups.map((group) => {
              const menuName = menuItems.find((m) => m.id === group.menu_item_id)?.name || group.menu_item_id
              return (
                <li key={group.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-card-foreground">{group.name}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">({menuName})</span>
                    {group.is_required && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">จำเป็น</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOptionGroup(group.id)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Manage Option Items (options) */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-card-foreground">2. เพิ่มตัวเลือกย่อย + ราคาบวกเพิ่ม (options)</h2>
          </div>

          <form onSubmit={handleAddOption} className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">เลือกกลุ่มตัวเลือกที่ต้องการใส่ตัวเลือกย่อย:</label>
              <select
                value={newOptionGroupId}
                onChange={(e) => setNewOptionGroupId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {optionGroups.map((g) => {
                  const menuName = menuItems.find((m) => m.id === g.menu_item_id)?.name || g.menu_item_id
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} ({menuName})
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="ชื่อตัวเลือกย่อย เช่น เส้นเล็ก / เผ็ดมาก"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                required
                min="0"
                step="1"
                placeholder="ราคาเพิ่ม (เช่น 0 หรือ 10)"
                value={newOptionExtraPrice}
                onChange={(e) => setNewOptionExtraPrice(e.target.value)}
                className="rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1 rounded-full bg-primary py-2.5 font-display text-xs font-bold text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4" /> เพิ่มตัวเลือกย่อย
            </button>
          </form>

          <ul className="mt-4 divide-y divide-border overflow-y-auto max-h-64">
            {optionsList.map((opt) => {
              const groupName = optionGroups.find((g) => g.id === opt.group_id)?.name || opt.group_id
              return (
                <li key={opt.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-card-foreground">{opt.name}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">({groupName})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">+{opt.extra_price}฿</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(opt.id)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* Recent Orders Table */}
      <section className="mx-auto mt-6 max-w-6xl rounded-3xl border border-border bg-card p-5 shadow-xs">
        <h2 className="border-b border-border pb-3 font-display text-lg font-bold text-card-foreground">ประวัติคำสั่งซื้อทั้งหมด</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2">โต๊ะ</th>
                <th className="pb-2">เวลา</th>
                <th className="pb-2">ยอดเงิน</th>
                <th className="pb-2">สถานะ</th>
                <th className="pb-2 text-right">สลิป</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => {
                const slipUrl = o.payments?.[0]?.slip_url
                return (
                  <tr key={o.id} className="hover:bg-secondary/40">
                    <td className="py-2.5 font-semibold text-card-foreground">โต๊ะ {o.table_id}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 font-bold text-primary">{o.total}฿</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          o.status === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : o.status === 'served'
                            ? 'bg-purple-500/15 text-purple-700'
                            : o.status === 'preparing'
                            ? 'bg-blue-500/15 text-blue-700'
                            : 'bg-amber-500/15 text-amber-700'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {slipUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSlip(slipUrl)}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80"
                        >
                          <Eye className="h-3 w-3" /> สลิป
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

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
    </main>
  )
}
