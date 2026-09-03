-- ==============================================================================
-- 🍜 ร้านแม่แต๋ (MaeTae Noodle Shop) - COMPLETE DATABASE SCHEMA & INITIAL SEED
-- ==============================================================================
-- วิธีใช้งาน:
-- 1. เข้าไปที่ Supabase Dashboard (https://supabase.com) > โปรเจกต์ของคุณ
-- 2. ไปที่เมนู "SQL Editor" (รูปไอคอน >_ แถบด้านซ้าย)
-- 3. คัดลอกโค้ดทั้งหมดนี้ไปวาง แล้วกดปุ่ม "Run" (หรือ Ctrl+Enter)
-- ==============================================================================

-- 1. ลบตารางเดิมและโครงสร้างเดิมเพื่อจัดระเบียบใหม่ทั้งหมด (Clean Reset)
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
-- 2. สร้างตารางทั้งหมด (Tables Schema)
-- ==============================================================================

-- 2.1 ตารางโต๊ะอาหาร (Tables)
CREATE TABLE tables (
    id TEXT PRIMARY KEY,                       -- เช่น 'T1', 'T2', '1', '2'
    name TEXT NOT NULL,                        -- เช่น 'โต๊ะ 1', 'โต๊ะ 2'
    is_active BOOLEAN DEFAULT TRUE,            -- เปิด/ปิด การใช้งานโต๊ะ
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
    id TEXT PRIMARY KEY,                       -- 'nam-tok', 'tom-yum', 'kmg-tom'
    category_id TEXT REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
    name TEXT NOT NULL,                        -- 'ก๋วยเตี๋ยวหมูน้ำตก'
    description TEXT,                          -- 'น้ำซุปเข้มข้น หมูนุ่ม โรยผักสด'
    price NUMERIC NOT NULL DEFAULT 0,          -- 55
    image_url TEXT,                            -- '/food/nam-tok.png'
    badge TEXT,                                -- '🔥 เมนูแนะนำ', '⭐ ขายดี', '👑 เมนูเด็ด'
    is_available BOOLEAN DEFAULT TRUE,         -- เปิด/ปิด สินค้าหมด
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 ตารางกลุ่มตัวเลือกของเมนู (Option Groups เช่น เลือกเส้น, เลือกน้ำ, ความหวาน)
CREATE TABLE option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id TEXT REFERENCES menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- 'เลือกเส้น', 'เลือกน้ำซุป', 'ระดับความหวาน'
    is_required BOOLEAN DEFAULT FALSE,         -- จำเป็นต้องเลือกหรือไม่
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 ตารางตัวเลือกย่อย (Options เช่น เส้นเล็ก, เส้นใหญ่, หวานน้อย)
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES option_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- 'เส้นเล็ก (+0฿)', 'เพิ่มเส้น (+10฿)'
    extra_price NUMERIC DEFAULT 0,             -- 0, 10, 15
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 ตารางคำสั่งซื้อหลัก (Orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id TEXT NOT NULL,                    -- 'T1', '1'
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'preparing', 'served', 'paid'
    total NUMERIC NOT NULL DEFAULT 0,          -- ยอดรวมทั้งหมด (บาท)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 ตารางรายการอาหารในออเดอร์ (Order Items)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    menu_item_id TEXT,
    name TEXT NOT NULL,                        -- 'ก๋วยเตี๋ยวหมูน้ำตก'
    price NUMERIC NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 ตารางตัวเลือกและหมายเหตุของแต่ละจาน (Order Item Options & Notes)
CREATE TABLE order_item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- 'เส้นเล็ก', '🥡 ใส่ถุงกลับบ้าน', '📝 หมายเหตุ: เผ็ดน้อย'
    extra_price NUMERIC DEFAULT 0
);

-- 2.9 ตารางการชำระเงินและสลิป (Payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    slip_url TEXT,                             -- URL รูปสลิปเงินโอน
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'paid'
    payment_method TEXT DEFAULT 'promptpay',   -- 'promptpay', 'cash'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. เปิดระบบ Realtime เพื่อให้แจ้งเตือนห้องครัวและรีเซ็ตบิลได้ทันที (0.1s)
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders, payments, menu_items, tables;
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

-- สร้างนโยบายให้ทุกคน (ลูกค้าและร้านค้า) ใช้งานระบบได้อย่างสมบูรณ์
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
-- 5. ข้อมูลเริ่มต้นร้านแม่แต๋ (Seed Initial Data)
-- ==============================================================================

-- 5.1 เพิ่มโต๊ะ 1 - 10
INSERT INTO tables (id, name, is_active) VALUES
('T1', 'โต๊ะ 1', true),
('T2', 'โต๊ะ 2', true),
('T3', 'โต๊ะ 3', true),
('T4', 'โต๊ะ 4', true),
('T5', 'โต๊ะ 5', true),
('T6', 'โต๊ะ 6', true),
('T7', 'โต๊ะ 7', true),
('T8', 'โต๊ะ 8', true),
('T9', 'โต๊ะ 9', true),
('T10', 'โต๊ะ 10', true);

-- 5.2 เพิ่มหมวดหมู่อาหาร
INSERT INTO categories (id, name, sort_order) VALUES
('guaytiew', 'ก๋วยเตี๋ยว', 1),
('khaomangai', 'เมนูข้าว', 2),
('drinks', 'เครื่องดื่ม', 3);

-- 5.3 เพิ่มเมนูอาหารเริ่มต้น
INSERT INTO menu_items (id, category_id, name, description, price, image_url, badge, sort_order) VALUES
('nam-tok', 'guaytiew', 'ก๋วยเตี๋ยวหมูน้ำตก', 'น้ำซุปเข้มข้น หมูนุ่ม โรยผักสด', 55, '/food/nam-tok.png', '🔥 เมนูแนะนำ', 1),
('tom-yum', 'guaytiew', 'ก๋วยเตี๋ยวต้มยำ', 'รสจัดจ้าน เปรี้ยวเผ็ด ใส่กุ้งและถั่วป่น', 60, '/food/tom-yum.png', '⭐ ขายดี', 2),
('yen-ta-fo', 'guaytiew', 'เย็นตาโฟ', 'น้ำสีชมพู ลูกชิ้นปลา ปลาหมึก ผักบุ้ง', 60, '/food/yen-ta-fo.png', NULL, 3),
('ba-mee', 'guaytiew', 'บะหมี่เกี๊ยวหมูแดง', 'บะหมี่เหลืองแห้ง หมูแดง เกี๊ยวกรอบ', 55, '/food/ba-mee.png', NULL, 4),
('kmg-tom', 'khaomangai', 'ข้าวมันไก่ต้ม', 'ไก่ต้มนุ่ม ข้าวมันหอม น้ำจิ้มขิงรสเด็ด', 50, '/food/khao-man-gai.png', '👑 เมนูเด็ด', 5),
('kmg-tod', 'khaomangai', 'ข้าวมันไก่ทอด', 'ไก่ทอดกรอบนอกนุ่มใน ข้าวมันหอม', 55, '/food/khao-man-gai-tod.png', NULL, 6),
('kmg-ruam', 'khaomangai', 'ข้าวมันไก่รวม', 'ไก่ต้มและไก่ทอดจัดเต็ม อิ่มคุ้ม', 65, '/food/khao-man-gai-ruam.png', '⭐ ขายดี', 7),
('cha-thai', 'drinks', 'ชาไทยเย็น', 'ชานมเข้มข้น หวานมัน กลมกล่อม', 30, '/food/cha-thai.png', '🔥 ขายดี', 8),
('nam-manao', 'drinks', 'น้ำมะนาว', 'สดชื่น เปรี้ยวหวานกำลังดี', 25, '/food/nam-manao.png', NULL, 9),
('kek-huay', 'drinks', 'เก๊กฮวยเย็น', 'ชาดอกเก๊กฮวย หอมชื่นใจ ดับร้อน', 25, '/food/kek-huay.png', NULL, 10);

-- 5.4 สร้าง Storage Bucket สำหรับเก็บรูปสลิปโอนเงิน (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to slips" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads on slips" ON storage.objects;

CREATE POLICY "Allow public uploads to slips" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'slips');

CREATE POLICY "Allow public reads on slips" ON storage.objects 
FOR SELECT USING (bucket_id = 'slips');

