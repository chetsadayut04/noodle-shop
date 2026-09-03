-- ==============================================================================
-- 🍜 ร้านแม่แต๋ (MaeTae Noodle Shop) - COMPLETE DATABASE & AUTHENTIC MENU SEED
-- ==============================================================================
-- ข้อมูลเมนูจริงตรงตามป้ายร้านแม่แต๋ 100% (เมนูเส้น, เครื่องเคียง, เครื่องดื่ม)
-- ==============================================================================

-- 1. ล้างตารางเดิมทั้งหมดเพื่อจัดระเบียบโครงสร้างใหม่ (Clean Reset)
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
    id TEXT PRIMARY KEY,                       -- 'T1', 'T2', '1', '2'
    name TEXT NOT NULL,                        -- 'โต๊ะ 1', 'โต๊ะ 2'
    is_active BOOLEAN DEFAULT TRUE,            -- สถานะเปิด/ปิด โต๊ะ
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 ตารางหมวดหมู่อาหาร (Categories)
CREATE TABLE categories (
    id TEXT PRIMARY KEY,                       -- 'noodles', 'side_dishes', 'drinks'
    name TEXT NOT NULL,                        -- 'เมนูเส้น', 'ทานเล่น / เพิ่มเติม', 'เครื่องดื่ม'
    sort_order INT DEFAULT 0
);

-- 2.3 ตารางรายการอาหาร (Menu Items)
CREATE TABLE menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    badge TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 ตารางกลุ่มตัวเลือก (Option Groups)
CREATE TABLE option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id TEXT REFERENCES menu_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 ตารางตัวเลือกย่อย (Options)
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES option_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,
    extra_price NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 ตารางคำสั่งซื้อ (Orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'preparing', 'served', 'paid'
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 ตารางรายการอาหารในแต่ละออเดอร์ (Order Items)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    menu_item_id TEXT,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 ตารางตัวเลือกและหมายเหตุของแต่ละจาน (Order Item Options & Notes)
CREATE TABLE order_item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES order_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name TEXT NOT NULL,
    extra_price NUMERIC DEFAULT 0
);

-- 2.9 ตารางการชำระเงินและสลิป (Payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
    slip_url TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT DEFAULT 'promptpay',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. เปิดระบบ Realtime เพื่อแจ้งเตือนห้องครัว & รีเซ็ตบิล (0.1s)
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
-- 5. ข้อมูลเริ่มต้นร้านแม่แต๋ (Seed Actual Menu from Store Board)
-- ==============================================================================

-- 5.1 โต๊ะ 1 - 10
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

-- 5.2 หมวดหมู่เมนู
INSERT INTO categories (id, name, sort_order) VALUES
('noodles', '🍜 เมนูเส้น', 1),
('side_dishes', '🍢 ทานเล่น / เพิ่มเติม', 2),
('drinks', '🥤 เครื่องดื่ม', 3);

-- 5.3 รายการอาหารจริงจากป้ายร้านแม่แต๋
INSERT INTO menu_items (id, category_id, name, description, price, image_url, badge, sort_order) VALUES
-- 🍜 เมนูเส้น
('nam-sai-moo', 'noodles', 'น้ำใสหมู', 'น้ำซุปใสกลมกล่อม หมูชิ้นนุ่ม ลูกชิ้น', 35, '/food/ba-mee.png', '⭐ ยอดนิยม', 1),
('nam-tok-moo', 'noodles', 'น้ำตกหมู', 'น้ำตกหมูเข้มข้น หอมสมุนไพร หมูนุ่ม ลูกชิ้น', 35, '/food/nam-tok.png', '🔥 เมนูเด็ด', 2),
('tom-yum-moo-namsai', 'noodles', 'ต้มยำหมูน้ำใส', 'รสเปรี้ยวเผ็ดแซ่บจี๊ดจ๊าด หมูนุ่ม มะนาวแท้', 40, '/food/tom-yum.png', NULL, 3),
('tom-yum-moo-namtok', 'noodles', 'ต้มยำหมูน้ำตก', 'เข้มข้นคูณสอง น้ำตกปรุงรสแซ่บต้มยำ จัดจ้าน', 40, '/food/nam-tok.png', '🔥 ขายดี', 4),
('yen-ta-fo', 'noodles', 'เย็นตาโฟ', 'ซอสเย็นตาโฟรสกลมกล่อม ลูกชิ้น เลือด ผักบุ้งกรอบ', 40, '/food/yen-ta-fo.png', NULL, 5),
('yen-ta-fo-tom-yum', 'noodles', 'เย็นตาโฟต้มยำ', 'โฟยำรสแซ่บ เปรี้ยวเผ็ดจี๊ดจ๊าด เครื่องแน่น', 50, '/food/yen-ta-fo.png', '⭐ แนะนำ', 6),
('tom-yum-talay-namsai', 'noodles', 'ต้มยำทะเลน้ำใส', 'กุ้ง หมึก ซีฟู้ดสดใหม่ น้ำใสเปรี้ยวเผ็ดกลมกล่อม', 50, '/food/tom-yum.png', NULL, 7),
('tom-yum-talay-namtok', 'noodles', 'ต้มยำทะเลน้ำตก', 'ทะเลจัดเต็มในน้ำตกต้มยำรสเด็ด เข้มข้นแซ่บถึงใจ', 50, '/food/nam-tok.png', NULL, 8),
('gao-lao', 'noodles', 'เกาเหลา', 'เกาเหลาหมู/เนื้อ เครื่องแน่น ผักสด น้ำซุปหอมกลมกล่อม', 40, '/food/nam-tok.png', NULL, 9),
('soup-dook', 'noodles', 'ซุปดูก (ซุปกระดูก)', 'ซุปกระดูกหมูต้มเปื่อย น้ำซุปหวานกระดูก ซดคล่องคอ', 50, '/food/ba-mee.png', '👑 ซิกเนเจอร์', 10),
('soup-dook-tom-yum', 'noodles', 'ซุปดูกต้มยำ', 'ซุปกระดูกต้มยำรสแซ่บจี๊ด เผ็ดเปรี้ยวลงตัว เนื้อนุ่มร่อน', 60, '/food/tom-yum.png', '🔥 เมนูเด็ด', 11),
('tiew-nua-toon', 'noodles', 'เตี๋ยวเนื้อตุ๋น', 'เนื้อตุ๋นยาจีนเปื่อยนุ่มละลายในปาก หอมกลิ่นเครื่องเทศ', 40, '/food/nam-tok.png', '✨ NEW มาใหม่', 12),
('tom-yum-nua-toon', 'noodles', 'ต้มยำเนื้อตุ๋น', 'เนื้อตุ๋นเปื่อยนุ่มปรุงรสต้มยำรสแซ่บ แซ่บถึงเนื้อ', 50, '/food/tom-yum.png', '✨ NEW มาใหม่', 13),

-- 🍢 ทานเล่น / เพิ่มเติม
('look-chin-moo', 'side_dishes', 'ลูกชิ้นหมูลวก (5 ลูก)', 'ลูกชิ้นหมูแท้เด้งนุ่ม ลวกโรยกระเทียมเจียวหอมๆ', 20, '/food/ba-mee.png', NULL, 14),
('look-chin-nua', 'side_dishes', 'ลูกชิ้นเนื้อลวก (5 ลูก)', 'ลูกชิ้นเนื้อเด้งสู้ฟัน รสกลมกล่อม ลวกสดใหม่', 20, '/food/nam-tok.png', NULL, 15),
('kai-tom', 'side_dishes', 'ไข่ต้ม', 'ไข่ต้มยางมะตูม เพิ่มความอร่อยในชาม', 7, '/food/tom-yum.png', NULL, 16),
('khao-plao', 'side_dishes', 'ข้าวเปล่า', 'ข้าวสวยร้อนๆ ทานคู่กับซุปดูกหรือเกาเหลา', 5, '/food/khao-man-gai.png', NULL, 17),

-- 🥤 เครื่องดื่ม (เริ่มต้น 25 บาท)
('kafe-boran', 'drinks', 'กาแฟโบราณ', 'กาแฟโบราณหอมกรุ่น เข้มข้นหวานมันแบบดั้งเดิม', 25, '/food/cha-thai.png', NULL, 18),
('kafe-yen', 'drinks', 'กาแฟเย็น', 'กาแฟเย็นสดชื่น หอมเข้ม กลมกล่อม', 25, '/food/cha-thai.png', NULL, 19),
('o-liang', 'drinks', 'โอเลี้ยง', 'โอเลี้ยงดำเข้ม หวานสดชื่น ดับกระหายคลายร้อน', 25, '/food/cha-thai.png', NULL, 20),
('cha-yen', 'drinks', 'ชาเย็น (ชาไทย)', 'ชาไทยสีส้มเข้มข้น หอมใบชา หวานมันกลมกล่อม', 25, '/food/cha-thai.png', '🔥 ขายดี', 21),
('cha-khiao', 'drinks', 'ชาเขียวเย็น', 'ชาเขียวนมกลิ่นหอมละมุน หวานมันชื่นใจ', 25, '/food/cha-thai.png', NULL, 22),
('cha-dam', 'drinks', 'ชาดำเย็น', 'ชาดำรสเข้ม หวานเย็นสดชื่น ชุ่มคอ', 25, '/food/cha-thai.png', NULL, 23),
('cha-manao', 'drinks', 'ชามะนาว', 'ชามะนาวรสเปรี้ยวอมหวาน สดชื่นคลายร้อน', 25, '/food/nam-manao.png', '⭐ สดชื่น', 24),
('nom-sod', 'drinks', 'นมสดเย็น', 'นมสดหอมมัน หวานกำลังดี นุ่มละมุน', 25, '/food/cha-thai.png', NULL, 25),
('nom-chompoo', 'drinks', 'นมชมพู (นมเย็น)', 'นมชมพูหวานหอม กลิ่นสละ นุ่มนวลสดชื่น', 25, '/food/cha-thai.png', NULL, 26),
('ovaltine', 'drinks', 'โอวัลตินเย็น', 'โอวัลตินมอลต์เข้มข้น หวานมันกลมกล่อม อร่อยถูกใจ', 25, '/food/cha-thai.png', NULL, 27),
('cocoa', 'drinks', 'โกโก้เย็น', 'โกโก้เข้มข้น รสชาติหวานมัน ช็อคโกแลตแท้', 25, '/food/cha-thai.png', '🔥 เข้มข้น', 28),
('cantaloupe', 'drinks', 'นมแคนตาลูป', 'หอมกลิ่นแคนตาลูป สดชื่น หวานมันลงตัว', 25, '/food/cha-thai.png', NULL, 29),
('nam-daeng-manao', 'drinks', 'น้ำแดงมะนาว', 'น้ำหวานเฮลบลูบอยผสมมะนาวแท้ เปรี้ยวหวานซาบซ่า', 25, '/food/nam-manao.png', NULL, 30),
('cha-khiao-manao', 'drinks', 'ชาเขียวมะนาว', 'ชาเขียวหอมสดชื่นผสมมะนาวแท้ ดับกระหายสดชื่น', 25, '/food/nam-manao.png', NULL, 31);

-- 5.4 Storage Bucket & Policies สำหรับสลิปโอนเงิน
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to slips" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads on slips" ON storage.objects;

CREATE POLICY "Allow public uploads to slips" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'slips');

CREATE POLICY "Allow public reads on slips" ON storage.objects 
FOR SELECT USING (bucket_id = 'slips');
