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
} from 'lucide-react'

type TableItem = {
  id: string
  name: string
}

type Order = {
  id: string
  table_id: string
  status: string
  total: number
  created_at: string
  payments?: { slip_url: string | null }[]
}

export default function AdminPage() {
  const [tables, setTables] = useState<TableItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [newTableId, setNewTableId] = useState('')
  const [newTableName, setNewTableName] = useState('')
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
        .insert({ id: newTableId, name: newTableName })

      if (error) throw error

      setNewTableId('')
      setNewTableName('')
      fetchData()
    } catch (err: any) {
      console.error('Add table error:', err)
      alert(err.message || 'ไม่สามารถเพิ่มโต๊ะได้')
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

  return (
    <main className="min-h-dvh bg-background p-4 sm:p-6">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">ระบบผู้ดูแลร้าน (Admin Dashboard)</h1>
            <p className="text-xs text-muted-foreground">สรุปยอดขาย การจัดการโต๊ะ และภาพรวมร้านอาหาร</p>
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

      {/* Table Management & Recent Orders */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Manage Tables */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <TableIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-card-foreground">จัดการโต๊ะอาหาร</h2>
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
              <li key={t.id} className="flex items-center justify-between py-2 text-xs">
                <span className="font-semibold text-card-foreground">{t.name} ({t.id})</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTable(t.id)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent Orders Table */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
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
      </div>

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

