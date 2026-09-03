export type Category = {
  id: string
  label: string
}

export type MenuOption = {
  id: string
  label: string
  price?: number
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  badge?: string
  options?: {
    groups: {
      id: string
      label: string
      required?: boolean
      options: MenuOption[]
    }[]
    extras?: MenuOption[]
  }
}

export type SelectedOptions = Record<string, MenuOption[]>

export const categories: Category[] = [
  { id: 'noodles', label: '🍜 เมนูเส้น' },
  { id: 'khaomangai', label: '🍚 เมนูข้าวมันไก่' },
  { id: 'drinks', label: '🥤 เครื่องดื่ม' },
]

// ตัวเลือกมาตรฐานสำหรับก๋วยเตี๋ยว (ธรรมดา/พิเศษ +5฿)
const noodleOptions35 = {
  groups: [
    {
      id: 'size',
      label: 'ขนาดจาน',
      required: true,
      options: [
        { id: 'regular', label: 'ธรรมดา (35฿)', price: 0 },
        { id: 'special', label: 'พิเศษ (40฿)', price: 5 },
      ],
    },
    {
      id: 'noodle_type',
      label: 'เลือกเส้น',
      required: true,
      options: [
        { id: 'senlek', label: 'เส้นเล็ก', price: 0 },
        { id: 'senyai', label: 'เส้นใหญ่', price: 0 },
        { id: 'bamee', label: 'บะหมี่เหลือง', price: 0 },
        { id: 'woonsen', label: 'วุ้นเส้น', price: 0 },
        { id: 'senmee', label: 'เส้นหมี่ขาว', price: 0 },
        { id: 'mama', label: 'มาม่า', price: 0 },
        { id: 'gaolao', label: 'เกาเหลา (ไม่เอาเส้น)', price: 0 },
      ],
    },
    {
      id: 'soup_style',
      label: 'รูปแบบ',
      required: true,
      options: [
        { id: 'soup', label: 'น้ำ', price: 0 },
        { id: 'dry', label: 'แห้ง', price: 0 },
      ],
    },
    {
      id: 'veg',
      label: 'ผัก',
      options: [
        { id: 'normal_veg', label: 'ใส่ผักปกติ', price: 0 },
        { id: 'bean_sprouts', label: 'ถั่วงอก', price: 0 },
        { id: 'morning_glory', label: 'ผักบุ้ง', price: 0 },
        { id: 'no_veg', label: 'ไม่ใส่ผัก', price: 0 },
      ],
    },
  ],
  extras: [
    { id: 'boiled_egg', label: 'ไข่ต้ม', price: 7 },
    { id: 'pork_balls', label: 'ลูกชิ้นหมู (5 ลูก)', price: 20 },
    { id: 'beef_balls', label: 'ลูกชิ้นเนื้อ (5 ลูก)', price: 20 },
    { id: 'rice', label: 'ข้าวเปล่า', price: 5 },
  ],
}

// ตัวเลือกสำหรับก๋วยเตี๋ยวราคา 40 / พิเศษ 50 (+10฿)
const noodleOptions40 = {
  groups: [
    {
      id: 'size',
      label: 'ขนาดจาน',
      required: true,
      options: [
        { id: 'regular', label: 'ธรรมดา (40฿)', price: 0 },
        { id: 'special', label: 'พิเศษ (50฿)', price: 10 },
      ],
    },
    {
      id: 'noodle_type',
      label: 'เลือกเส้น',
      required: true,
      options: [
        { id: 'senlek', label: 'เส้นเล็ก', price: 0 },
        { id: 'senyai', label: 'เส้นใหญ่', price: 0 },
        { id: 'bamee', label: 'บะหมี่เหลือง', price: 0 },
        { id: 'woonsen', label: 'วุ้นเส้น', price: 0 },
        { id: 'senmee', label: 'เส้นหมี่ขาว', price: 0 },
        { id: 'mama', label: 'มาม่า', price: 0 },
        { id: 'gaolao', label: 'เกาเหลา (ไม่เอาเส้น)', price: 0 },
      ],
    },
    {
      id: 'soup_style',
      label: 'รูปแบบ',
      required: true,
      options: [
        { id: 'soup', label: 'น้ำ', price: 0 },
        { id: 'dry', label: 'แห้ง', price: 0 },
      ],
    },
    {
      id: 'veg',
      label: 'ผัก',
      options: [
        { id: 'normal_veg', label: 'ใส่ผักปกติ', price: 0 },
        { id: 'bean_sprouts', label: 'ถั่วงอก', price: 0 },
        { id: 'morning_glory', label: 'ผักบุ้ง', price: 0 },
        { id: 'no_veg', label: 'ไม่ใส่ผัก', price: 0 },
      ],
    },
  ],
  extras: [
    { id: 'boiled_egg', label: 'ไข่ต้ม', price: 7 },
    { id: 'pork_balls', label: 'ลูกชิ้นหมู (5 ลูก)', price: 20 },
    { id: 'beef_balls', label: 'ลูกชิ้นเนื้อ (5 ลูก)', price: 20 },
    { id: 'rice', label: 'ข้าวเปล่า', price: 5 },
  ],
}

// ตัวเลือกสำหรับก๋วยเตี๋ยวราคา 50 / พิเศษ 60 (+10฿)
const noodleOptions50 = {
  groups: [
    {
      id: 'size',
      label: 'ขนาดจาน',
      required: true,
      options: [
        { id: 'regular', label: 'ธรรมดา (50฿)', price: 0 },
        { id: 'special', label: 'พิเศษ (60฿)', price: 10 },
      ],
    },
    {
      id: 'noodle_type',
      label: 'เลือกเส้น',
      required: true,
      options: [
        { id: 'senlek', label: 'เส้นเล็ก', price: 0 },
        { id: 'senyai', label: 'เส้นใหญ่', price: 0 },
        { id: 'bamee', label: 'บะหมี่เหลือง', price: 0 },
        { id: 'woonsen', label: 'วุ้นเส้น', price: 0 },
        { id: 'senmee', label: 'เส้นหมี่ขาว', price: 0 },
        { id: 'mama', label: 'มาม่า', price: 0 },
        { id: 'gaolao', label: 'เกาเหลา (ไม่เอาเส้น)', price: 0 },
      ],
    },
    {
      id: 'soup_style',
      label: 'รูปแบบ',
      required: true,
      options: [
        { id: 'soup', label: 'น้ำ', price: 0 },
        { id: 'dry', label: 'แห้ง', price: 0 },
      ],
    },
    {
      id: 'veg',
      label: 'ผัก',
      options: [
        { id: 'normal_veg', label: 'ใส่ผักปกติ', price: 0 },
        { id: 'bean_sprouts', label: 'ถั่วงอก', price: 0 },
        { id: 'morning_glory', label: 'ผักบุ้ง', price: 0 },
        { id: 'no_veg', label: 'ไม่ใส่ผัก', price: 0 },
      ],
    },
  ],
  extras: [
    { id: 'boiled_egg', label: 'ไข่ต้ม', price: 7 },
    { id: 'pork_balls', label: 'ลูกชิ้นหมู (5 ลูก)', price: 20 },
    { id: 'beef_balls', label: 'ลูกชิ้นเนื้อ (5 ลูก)', price: 20 },
    { id: 'rice', label: 'ข้าวเปล่า', price: 5 },
  ],
}

// ตัวเลือกสำหรับข้าวมันไก่ (ธรรมดา/พิเศษ +10฿)
const khaoManGaiOptions = {
  groups: [
    {
      id: 'size',
      label: 'ขนาดจาน',
      required: true,
      options: [
        { id: 'regular', label: 'ธรรมดา', price: 0 },
        { id: 'special', label: 'พิเศษ (+10฿)', price: 10 },
      ],
    },
    {
      id: 'meat_pref',
      label: 'เนื้อไก่',
      options: [
        { id: 'all_meat', label: 'เนื้อผสมหนัง (ปกติ)', price: 0 },
        { id: 'no_skin', label: 'ไม่เอาหนัง (เนื้อล้วน)', price: 0 },
        { id: 'extra_skin', label: 'เน้นหนัง', price: 0 },
      ],
    },
    {
      id: 'side_add',
      label: 'เครื่องเคียงเพิ่ม',
      options: [
        { id: 'liver', label: 'เพิ่มตับไก่ (+10฿)', price: 10 },
        { id: 'extra_rice', label: 'เพิ่มข้าวมัน (+10฿)', price: 10 },
        { id: 'egg', label: 'ไข่ต้มยางมะตูม (+7฿)', price: 7 },
        { id: 'soup_extra', label: 'น้ำซุปมะนาวดอง (+0฿)', price: 0 },
      ],
    },
  ],
}

// ตัวเลือกเครื่องดื่ม (แก้วเล็ก 25฿ / แก้วใหญ่ 35฿)
const drinkOptions = {
  groups: [
    {
      id: 'cup_size',
      label: 'ขนาดแก้ว',
      required: true,
      options: [
        { id: 'small', label: 'แก้วเล็ก (25฿)', price: 0 },
        { id: 'large', label: 'แก้วใหญ่ (35฿)', price: 10 },
      ],
    },
    {
      id: 'sweetness',
      label: 'ระดับความหวาน',
      required: true,
      options: [
        { id: 'sweet_normal', label: 'หวานปกติ (100%)', price: 0 },
        { id: 'sweet_less', label: 'หวานน้อย (50%)', price: 0 },
        { id: 'sweet_none', label: 'ไม่หวาน (0%)', price: 0 },
      ],
    },
    {
      id: 'ice_level',
      label: 'ปริมาณน้ำแข็ง',
      options: [
        { id: 'ice_normal', label: 'น้ำแข็งปกติ', price: 0 },
        { id: 'ice_less', label: 'น้ำแข็งน้อย', price: 0 },
        { id: 'ice_none', label: 'ไม่ใส่น้ำแข็ง', price: 0 },
      ],
    },
  ],
}

export const menuItems: MenuItem[] = [
  // ================= 🍜 หมวดเมนูเส้น =================
  {
    id: 'nam-sai-moo',
    name: 'น้ำใสหมู',
    description: 'น้ำซุปใสกลมกล่อม หมูชิ้นนุ่ม ลูกชิ้น โรยผักชีหอม',
    price: 35,
    image: '/food/ba-mee.png',
    category: 'noodles',
    badge: '⭐ ยอดนิยม',
    options: noodleOptions35,
  },
  {
    id: 'nam-tok-moo',
    name: 'น้ำตกหมู',
    description: 'น้ำตกหมูเข้มข้น หอมสมุนไพร หมูนุ่ม ลูกชิ้น',
    price: 35,
    image: '/food/nam-tok.png',
    category: 'noodles',
    badge: '🔥 เมนูเด็ด',
    options: noodleOptions35,
  },
  {
    id: 'tom-yum-moo-namsai',
    name: 'ต้มยำหมูน้ำใส',
    description: 'รสชาติเปรี้ยวเผ็ดแซ่บจี๊ดจ๊าด หมูนุ่ม ไข่ต้ม มะนาวแท้',
    price: 40,
    image: '/food/tom-yum.png',
    category: 'noodles',
    options: noodleOptions40,
  },
  {
    id: 'tom-yum-moo-namtok',
    name: 'ต้มยำหมูน้ำตก',
    description: 'เข้มข้นคูณสอง น้ำตกปรุงรสแซ่บต้มยำ จัดจ้านถึงใจ',
    price: 40,
    image: '/food/nam-tok.png',
    category: 'noodles',
    badge: '🔥 ขายดี',
    options: noodleOptions40,
  },
  {
    id: 'yen-ta-fo',
    name: 'เย็นตาโฟ',
    description: 'ซอสเย็นตาโฟรสกลมกล่อม ลูกชิ้น เลือด ผักบุ้งกรอบ',
    price: 40,
    image: '/food/yen-ta-fo.png',
    category: 'noodles',
    options: noodleOptions40,
  },
  {
    id: 'yen-ta-fo-tom-yum',
    name: 'เย็นตาโฟต้มยำ',
    description: 'โฟยำรสแซ่บ เปรี้ยวเผ็ดจี๊ดจ๊าด เครื่องแน่น',
    price: 50,
    image: '/food/yen-ta-fo.png',
    category: 'noodles',
    badge: '⭐ แนะนำ',
    options: noodleOptions50,
  },
  {
    id: 'tom-yum-talay-namsai',
    name: 'ต้มยำทะเลน้ำใส',
    description: 'กุ้ง หมึก ซีฟู้ดสดใหม่ น้ำใสเปรี้ยวเผ็ดกลมกล่อม',
    price: 50,
    image: '/food/tom-yum.png',
    category: 'noodles',
    options: noodleOptions50,
  },
  {
    id: 'tom-yum-talay-namtok',
    name: 'ต้มยำทะเลน้ำตก',
    description: 'ทะเลจัดเต็มในน้ำตกต้มยำรสเด็ด เข้มข้นแซ่บถึงใจ',
    price: 50,
    image: '/food/nam-tok.png',
    category: 'noodles',
    options: noodleOptions50,
  },
  {
    id: 'gao-lao',
    name: 'เกาเหลา',
    description: 'เกาเหลาเนื้อ/หมู เครื่องแน่น ผักสด น้ำซุปหอมกลมกล่อม',
    price: 40,
    image: '/food/nam-tok.png',
    category: 'noodles',
    options: noodleOptions40,
  },
  {
    id: 'soup-dook',
    name: 'ซุปดูก (ซุปกระดูก)',
    description: 'ซุปกระดูกหมูต้มเปื่อย น้ำซุปหวานกระดูก ซดคล่องคอ',
    price: 50,
    image: '/food/ba-mee.png',
    category: 'noodles',
    badge: '👑 ซิกเนเจอร์',
  },
  {
    id: 'soup-dook-tom-yum',
    name: 'ซุปดูกต้มยำ',
    description: 'ซุปกระดูกต้มยำรสแซ่บจี๊ด เผ็ดเปรี้ยวลงตัว เนื้อนุ่มร่อน',
    price: 60,
    image: '/food/tom-yum.png',
    category: 'noodles',
    badge: '🔥 เมนูเด็ด',
  },
  {
    id: 'tiew-nua-toon',
    name: 'เตี๋ยวเนื้อตุ๋น',
    description: 'เนื้อตุ๋นยาจีนเปื่อยนุ่มละลายในปาก หอมกลิ่นเครื่องเทศ',
    price: 40,
    image: '/food/nam-tok.png',
    category: 'noodles',
    badge: '✨ NEW มาใหม่',
    options: noodleOptions40,
  },
  {
    id: 'tom-yum-nua-toon',
    name: 'ต้มยำเนื้อตุ๋น',
    description: 'เนื้อตุ๋นเปื่อยนุ่มปรุงรสต้มยำรสแซ่บ แซ่บถึงเนื้อ',
    price: 50,
    image: '/food/tom-yum.png',
    category: 'noodles',
    badge: '✨ NEW มาใหม่',
    options: noodleOptions50,
  },

  // ================= 🍚 หมวดเมนูข้าวมันไก่ =================
  {
    id: 'kmg-tom',
    name: 'ข้าวมันไก่ต้ม',
    description: 'ไก่ต้มนุ่มฉ่ำ ข้าวมันหอมเรียงเม็ด น้ำจิ้มเต้าเจี้ยวขิงรสเด็ด',
    price: 50,
    image: '/food/khao-man-gai.png',
    category: 'khaomangai',
    badge: '👑 เมนูเด็ด',
    options: khaoManGaiOptions,
  },
  {
    id: 'kmg-tod',
    name: 'ข้าวมันไก่ทอด',
    description: 'ไก่ทอดสีทองกรอบนอกนุ่มใน ข้าวมันหอม น้ำจิ้มไก่หวานแซ่บ',
    price: 55,
    image: '/food/khao-man-gai-tod.png',
    category: 'khaomangai',
    badge: '⭐ กรอบอร่อย',
    options: khaoManGaiOptions,
  },
  {
    id: 'kmg-ruam',
    name: 'ข้าวมันไก่รวม (ต้ม+ทอด)',
    description: 'ไก่ต้มและไก่ทอดจัดเต็มในจานเดียว อิ่มคุ้มจุใจ',
    price: 65,
    image: '/food/khao-man-gai-ruam.png',
    category: 'khaomangai',
    badge: '🔥 ขายดีอันดับ 1',
    options: khaoManGaiOptions,
  },
  {
    id: 'kmg-yang',
    name: 'ข้าวมันไก่ย่าง',
    description: 'ไก่ย่างหมักสมุนไพรหอมกรุ่น เนื้อนุ่มฉ่ำ ข้าวมันร้อนๆ',
    price: 55,
    image: '/food/khao-man-gai.png',
    category: 'khaomangai',
    options: khaoManGaiOptions,
  },
  {
    id: 'kmg-zaab',
    name: 'ข้าวมันไก่แซ่บ',
    description: 'ไก่ทอดกรอบคลุกเคล้าเครื่องลาบแซ่บจี๊ด เผ็ดเปรี้ยวลงตัว',
    price: 55,
    image: '/food/khao-man-gai-tod.png',
    category: 'khaomangai',
    badge: '🌶️ แซ่บจี๊ด',
    options: khaoManGaiOptions,
  },

  // ================= 🥤 หมวดเครื่องดื่ม =================
  {
    id: 'kafe-boran',
    name: 'กาแฟโบราณ',
    description: 'กาแฟโบราณหอมกรุ่น เข้มข้นหวานมันแบบดั้งเดิม',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'kafe-yen',
    name: 'กาแฟเย็น',
    description: 'กาแฟเย็นสดชื่น หอมเข้ม กลมกล่อม',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'o-liang',
    name: 'โอเลี้ยง',
    description: 'โอเลี้ยงดำเข้ม หวานสดชื่น ดับกระหายคลายร้อน',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'cha-yen',
    name: 'ชาเย็น (ชาไทย)',
    description: 'ชาไทยสีส้มเข้มข้น หอมใบชา หวานมันกลมกล่อม',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    badge: '🔥 ขายดี',
    options: drinkOptions,
  },
  {
    id: 'cha-khiao',
    name: 'ชาเขียวเย็น',
    description: 'ชาเขียวนมกลิ่นหอมละมุน หวานมันชื่นใจ',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'cha-dam',
    name: 'ชาดำเย็น',
    description: 'ชาดำรสเข้ม หวานเย็นสดชื่น ชุ่มคอ',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'cha-manao',
    name: 'ชามะนาว',
    description: 'ชามะนาวรสเปรี้ยวอมหวาน สดชื่นคลายร้อน',
    price: 25,
    image: '/food/nam-manao.png',
    category: 'drinks',
    badge: '⭐ สดชื่น',
    options: drinkOptions,
  },
  {
    id: 'nom-sod',
    name: 'นมสดเย็น',
    description: 'นมสดหอมมัน หวานกำลังดี นุ่มละมุน',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'nom-chompoo',
    name: 'นมชมพู (นมเย็น)',
    description: 'นมชมพูหวานหอม กลิ่นสละ นุ่มนวลสดชื่น',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'ovaltine',
    name: 'โอวัลตินเย็น',
    description: 'โอวัลตินมอลต์เข้มข้น หวานมันกลมกล่อม อร่อยถูกใจ',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'cocoa',
    name: 'โกโก้เย็น',
    description: 'โกโก้เข้มข้น รสชาติหวานมัน ช็อคโกแลตแท้',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    badge: '🔥 เข้มข้น',
    options: drinkOptions,
  },
  {
    id: 'cantaloupe',
    name: 'นมแคนตาลูป',
    description: 'หอมกลิ่นแคนตาลูป สดชื่น หวานมันลงตัว',
    price: 25,
    image: '/food/cha-thai.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'nam-daeng-manao',
    name: 'น้ำแดงมะนาว',
    description: 'น้ำหวานเฮลบลูบอยผสมมะนาวแท้ เปรี้ยวหวานซาบซ่า',
    price: 25,
    image: '/food/nam-manao.png',
    category: 'drinks',
    options: drinkOptions,
  },
  {
    id: 'cha-khiao-manao',
    name: 'ชาเขียวมะนาว',
    description: 'ชาเขียวหอมสดชื่นผสมมะนาวแท้ ดับกระหายสดชื่น',
    price: 25,
    image: '/food/nam-manao.png',
    category: 'drinks',
    options: drinkOptions,
  },
]

export const optionSummary = (selected: SelectedOptions, instructions?: string, packaging?: 'dine-in' | 'takeaway') => {
  const pkg = packaging === 'takeaway' ? '🥡 ใส่ถุงกลับบ้าน' : ''
  const opts = Object.values(selected).flat().map((option) => option.label).join(' · ')
  const note = instructions?.trim() ? `📝 ${instructions.trim()}` : ''
  const parts = [pkg, opts, note].filter(Boolean)
  return parts.join(' | ')
}

export const optionPrice = (selected: SelectedOptions) =>
  Object.values(selected).flat().reduce((sum, option) => sum + (option.price ?? 0), 0)

export const optionsKey = (selected: SelectedOptions, instructions?: string, packaging?: 'dine-in' | 'takeaway') =>
  JSON.stringify({ s: selected, i: (instructions || '').trim(), p: packaging || 'dine-in' })

export function hasRequiredOptions(item: MenuItem, selected: SelectedOptions) {
  return !item.options?.groups.some((group) => group.required && !selected[group.id]?.length)
}

export function defaultOptions(item: MenuItem): SelectedOptions {
  return Object.fromEntries(item.options?.groups.map((group) => [group.id, [group.options[0]]]) ?? [])
}
