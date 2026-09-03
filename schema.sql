-- ==============================================================================
-- 🍜 ร้านแม่แต๋ (MaeTae Noodle Shop) - CLEAN DATABASE STRUCTURE (NO MOCK DATA)
-- ==============================================================================
-- โครงสร้างฐานข้อมูลเปล่า 100% พร้อมใช้งาน (ไม่มีข้อมูลตัวอย่าง คุณสามารถเพิ่มเองได้เลย)
-- ==============================================================================

-- 1. ลบตารางเดิมทั้งหมดเพื่อจัดระเบียบโครงสร้างใหม่แบบสะอาดหมดจด (Clean Reset)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_item_options CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS option_groups CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tables CASCADE;

-- ==============================================================================
-- 2. สร้างตารางโครงสร้างหลังบ้านทั้งหมด (Tables Schema)
-- ==============================================================================

-- 2.1 ตารางโต๊ะอาหาร (Tables)
CREATE TABLE tables (
    id TEXT PRIMARY KEY,                       -- เช่น 'T1', 'T2', '1', '2'
    name TEXT NOT NULL,                        -- เช่น 'โต๊ะ 1', 'โต๊ะ 2'
    is_active BOOLEAN DEFAULT TRUE,            -- สถานะเปิด/ปิด โต๊ะ
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 ตารางหมวดหมู่อาหาร (Categories)
CREATE TABLE categories (
    id TEXT PRIMARY KEY,                       -- 'guaytiew', 'khaomangai', 'drinks'
    name TEXT NOT NULL,                        -- 'ก๋วยเตี๋ยว', 'เมนูข้าว', 'เครื่องดื่ม'
    sort_order INT DEFAULT 0
);

-- 2.3 ตารางรายการอาหาร (Menu Items)
CREATE TABLE menu_items (
    id TEXT PRIMARY KEY,                       -- รหัสเมนู เช่น 'nam-tok', 'm1'
    category_id TEXT REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
    name TEXT NOT NULL,                        -- ชื่อเมนู
    description TEXT,                          -- คำอธิบายเมนู
    price NUMERIC NOT NULL DEFAULT 0,          -- ราคา (บาท)
    image_url TEXT,                            -- รูปภาพเมนู
    badge TEXT,                                -- ป้ายพิเศษ เช่น '🔥 เมนูแนะนำ', '⭐ ขายดี'
    is_available BOOLEAN DEFAULT TRUE,         -- สถานะพร้อมขาย / สินค้าหมด
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 ตารางกลุ่มตัวเลือก (Option Groups เช่น เลือกเส้น, เลือกน้ำซุป, เพิ่มของได้ตามใจ)
CREATE TABLE option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id TEXT REFERENCES menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- ชื่อกลุ่มตัวเลือก
    is_required BOOLEAN DEFAULT FALSE,         -- บังคับเลือกหรือไม่ (true/false)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 ตารางตัวเลือกย่อย (Options เช่น เส้นเล็ก, ไข่ต้ม, แคบหมู)
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES option_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- ชื่อตัวเลือก
    extra_price NUMERIC DEFAULT 0,             -- ราคาบวกเพิ่ม (บาท)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 ตารางคำสั่งซื้อ (Orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id TEXT NOT NULL,                    -- โต๊ะที่สั่ง
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'preparing', 'served', 'paid'
    total NUMERIC NOT NULL DEFAULT 0,          -- ยอดรวมทั้งหมด (บาท)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 ตารางรายการอาหารในแต่ละออเดอร์ (Order Items)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    menu_item_id TEXT,
    name TEXT NOT NULL,                        -- ชื่ออาหาร
    price NUMERIC NOT NULL DEFAULT 0,          -- ราคาต่อหน่วย
    qty INT NOT NULL DEFAULT 1,                -- จำนวนจาน
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 ตารางตัวเลือกและหมายเหตุของแต่ละจาน (Order Item Options & Notes)
CREATE TABLE order_item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- ตัวเลือก เช่น 'เส้นเล็ก', '🥡 ใส่ถุงกลับบ้าน', '📝 หมายเหตุ'
    extra_price NUMERIC DEFAULT 0
);

-- 2.9 ตารางการชำระเงินและสลิป (Payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    slip_url TEXT,                             -- ลิงก์รูปสลิป
    amount NUMERIC NOT NULL DEFAULT 0,         -- จำนวนเงินที่ชำระ
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'paid'
    payment_method TEXT DEFAULT 'promptpay',   -- 'promptpay', 'cash'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. เปิดระบบ Realtime แจ้งเตือนห้องครัว & รีเซ็ตบิลอัตโนมัติ (0.1s)
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders, payments, menu_items, tables, option_groups, options;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 4. ตั้งค่าสิทธิ์ความปลอดภัย (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access to tables" ON tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to option_groups" ON option_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to options" ON options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to order_item_options" ON order_item_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. สร้างหมวดหมู่หลัก 3 หมวด (เพื่อรองรับปุ่มกดในหน้าแอดมินและหน้าร้าน)
-- ==============================================================================
INSERT INTO categories (id, name, sort_order) VALUES
('guaytiew', 'ก๋วยเตี๋ยว', 1),
('khaomangai', 'เมนูข้าว', 2),
('drinks', 'เครื่องดื่ม', 3)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 6. Storage Bucket สำหรับเก็บรูปสลิปโอนเงิน (Public)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to slips" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads on slips" ON storage.objects;

CREATE POLICY "Allow public uploads to slips" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'slips');

CREATE POLICY "Allow public reads on slips" ON storage.objects 
FOR SELECT USING (bucket_id = 'slips');
