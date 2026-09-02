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
  { id: 'guaytiew', label: 'ก๋วยเตี๋ยว' },
  { id: 'khaomangai', label: 'ข้าว' },
  { id: 'drinks', label: 'น้ำ' },
]

const noodleOptions = {
  groups: [
    { id: 'noodle', label: 'เลือกเส้น', required: true, options: [{ id: 'senlek', label: 'เส้นเล็ก' }, { id: 'senyai', label: 'เส้นใหญ่' }, { id: 'บะหมี่', label: 'บะหมี่เหลือง' }, { id: 'วุ้นเส้น', label: 'วุ้นเส้น' }] },
    { id: 'soup', label: 'เลือกน้ำ', required: true, options: [{ id: 'namtok', label: 'น้ำตก' }, { id: 'tom-yum', label: 'ต้มยำ' }, { id: 'แห้ง', label: 'แห้ง' }] },
    { id: 'meat', label: 'เลือกเนื้อ', required: true, options: [{ id: 'pork', label: 'หมู' }, { id: 'beef', label: 'เนื้อ' }, { id: 'ลูกชิ้น', label: 'ลูกชิ้นปลา' }] },
    { id: 'veg', label: 'เลือกผัก', options: [{ id: 'ถั่วงอก', label: 'ถั่วงอก' }, { id: 'ผักบุ้ง', label: 'ผักบุ้ง' }, { id: 'ไม่ผัก', label: 'ไม่ใส่ผัก' }] },
  ],
  extras: [{ id: 'ไข่ต้ม', label: 'ไข่ต้ม', price: 10 }, { id: 'พิเศษ', label: 'เพิ่มเส้น', price: 10 }, { id: 'แคบหมู', label: 'แคบหมู', price: 15 }],
}

const drinkOptions = {
  groups: [
    { id: 'sweetness', label: 'ระดับความหวาน', required: true, options: [{ id: 'หวานน้อย', label: 'หวานน้อย' }, { id: 'หวานปกติ', label: 'หวานปกติ' }, { id: 'หวานมาก', label: 'หวานมาก' }] },
    { id: 'ice', label: 'ปริมาณน้ำแข็ง', required: true, options: [{ id: 'ไม่ใส่น้ำแข็ง', label: 'ไม่ใส่น้ำแข็ง' }, { id: 'น้ำแข็งน้อย', label: 'น้ำแข็งน้อย' }, { id: 'น้ำแข็งปกติ', label: 'น้ำแข็งปกติ' }] },
  ],
}

export const menuItems: MenuItem[] = [
  { id: 'nam-tok', name: 'ก๋วยเตี๋ยวหมูน้ำตก', description: 'น้ำซุปเข้มข้น หมูนุ่ม โรยผักสด', price: 55, image: '/food/nam-tok.png', category: 'guaytiew', options: noodleOptions },
  { id: 'tom-yum', name: 'ก๋วยเตี๋ยวต้มยำ', description: 'รสจัดจ้าน เปรี้ยวเผ็ด ใส่กุ้งและถั่วป่น', price: 60, image: '/food/tom-yum.png', category: 'guaytiew', options: noodleOptions },
  { id: 'yen-ta-fo', name: 'เย็นตาโฟ', description: 'น้ำสีชมพู ลูกชิ้นปลา ปลาหมึก ผักบุ้ง', price: 60, image: '/food/yen-ta-fo.png', category: 'guaytiew', options: noodleOptions },
  { id: 'ba-mee', name: 'บะหมี่เกี๊ยวหมูแดง', description: 'บะหมี่เหลืองแห้ง หมูแดง เกี๊ยวกรอบ', price: 55, image: '/food/ba-mee.png', category: 'guaytiew', options: noodleOptions },
  { id: 'kmg-tom', name: 'ข้าวมันไก่ต้ม', description: 'ไก่ต้มนุ่ม ข้าวมันหอม น้ำจิ้มขิงรสเด็ด', price: 50, image: '/food/khao-man-gai.png', category: 'khaomangai' },
  { id: 'kmg-tod', name: 'ข้าวมันไก่ทอด', description: 'ไก่ทอดกรอบนอกนุ่มใน ข้าวมันหอม', price: 55, image: '/food/khao-man-gai-tod.png', category: 'khaomangai' },
  { id: 'kmg-ruam', name: 'ข้าวมันไก่รวม', description: 'ไก่ต้มและไก่ทอดจัดเต็ม อิ่มคุ้ม', price: 65, image: '/food/khao-man-gai-ruam.png', category: 'khaomangai' },
  { id: 'cha-thai', name: 'ชาไทยเย็น', description: 'ชานมเข้มข้น หวานมัน กลมกล่อม', price: 30, image: '/food/cha-thai.png', category: 'drinks', options: drinkOptions },
  { id: 'nam-manao', name: 'น้ำมะนาว', description: 'สดชื่น เปรี้ยวหวานกำลังดี', price: 25, image: '/food/nam-manao.png', category: 'drinks', options: drinkOptions },
  { id: 'kek-huay', name: 'เก๊กฮวยเย็น', description: 'ชาดอกเก๊กฮวย หอมชื่นใจ ดับร้อน', price: 25, image: '/food/kek-huay.png', category: 'drinks', options: drinkOptions },
]

export const optionSummary = (selected: SelectedOptions) => Object.values(selected).flat().map((option) => option.label).join(' · ')
export const optionPrice = (selected: SelectedOptions) => Object.values(selected).flat().reduce((sum, option) => sum + (option.price ?? 0), 0)
export const optionsKey = (selected: SelectedOptions) => JSON.stringify(selected)

export function hasRequiredOptions(item: MenuItem, selected: SelectedOptions) {
  return !item.options?.groups.some((group) => group.required && !selected[group.id]?.length)
}

export function defaultOptions(item: MenuItem): SelectedOptions {
  return Object.fromEntries(item.options?.groups.map((group) => [group.id, [group.options[0]]]) ?? [])
}

