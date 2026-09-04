// 节日数据：使用 lucide-react 图标（禁用 emoji）
// 固定公历节日每年通用

interface Festival {
  /** lucide-react 图标名（非 emoji，保证 SVG/静态渲染一致） */
  icon: string
  name: string
  /** 标签配色（tailwind 类名） */
  cls: string
}

/** 固定公历节日：key 为 MM-DD */
export const SOLAR_FESTIVALS: Record<string, Festival> = {
  '01-01': { icon: 'PartyPopper', name: '元旦', cls: 'bg-red-50/90 text-red-500' },
  '02-14': { icon: 'Heart', name: '情人节', cls: 'bg-pink-50/90 text-pink-500' },
  '03-08': { icon: 'Flower2', name: '妇女节', cls: 'bg-pink-50/90 text-pink-500' },
  '03-12': { icon: 'TreeDeciduous', name: '植树节', cls: 'bg-green-50/90 text-green-600' },
  '04-05': { icon: 'TreePine', name: '清明节', cls: 'bg-emerald-50/90 text-emerald-600' },
  '05-01': { icon: 'Construction', name: '劳动节', cls: 'bg-orange-50/90 text-orange-500' },
  '05-04': { icon: 'Star', name: '青年节', cls: 'bg-yellow-50/90 text-yellow-600' },
  '06-01': { icon: 'PartyPopper', name: '儿童节', cls: 'bg-sky-50/90 text-sky-500' },
  '07-01': { icon: 'Heart', name: '建党节', cls: 'bg-red-50/90 text-red-600' },
  '08-01': { icon: 'Shield', name: '建军节', cls: 'bg-rose-50/90 text-rose-600' },
  '09-10': { icon: 'Apple', name: '教师节', cls: 'bg-purple-50/90 text-purple-500' },
  '10-01': { icon: 'Flag', name: '国庆节', cls: 'bg-red-50/90 text-red-600' },
  '10-31': { icon: 'Ghost', name: '万圣节', cls: 'bg-orange-50/90 text-orange-600' },
  '12-24': { icon: 'Star', name: '平安夜', cls: 'bg-indigo-50/90 text-indigo-500' },
  '12-25': { icon: 'Gift', name: '圣诞节', cls: 'bg-red-50/90 text-red-500' },
}

/** 获取某天的公历节日信息，无节日返回 null */
export function getFestival(dateStr: string): Festival | null {
  return SOLAR_FESTIVALS[dateStr.slice(5)] ?? null
}