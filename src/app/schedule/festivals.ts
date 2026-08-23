// 节日数据：供日历格子显示彩色角标使用
// 固定公历节日每年通用；农历节日（含清明节）为预置对照表，覆盖 2024-2030 年

interface Festival {
  emoji: string
  name: string
  /** 标签配色（tailwind 类名） */
  cls: string
}

/** 固定公历节日：key 为 MM-DD */
const SOLAR_FESTIVALS: Record<string, Festival> = {
  '01-01': { emoji: '🎉', name: '元旦', cls: 'bg-red-50/90 text-red-500' },
  '03-08': { emoji: '💐', name: '妇女节', cls: 'bg-pink-50/90 text-pink-500' },
  '03-12': { emoji: '🌳', name: '植树节', cls: 'bg-green-50/90 text-green-600' },
  '05-01': { emoji: '🔨', name: '劳动节', cls: 'bg-orange-50/90 text-orange-500' },
  '05-04': { emoji: '⭐', name: '青年节', cls: 'bg-yellow-50/90 text-yellow-600' },
  '06-01': { emoji: '🎈', name: '儿童节', cls: 'bg-sky-50/90 text-sky-500' },
  '07-01': { emoji: '❤️', name: '建党节', cls: 'bg-red-50/90 text-red-600' },
  '08-01': { emoji: '🎖️', name: '建军节', cls: 'bg-rose-50/90 text-rose-600' },
  '09-10': { emoji: '🍎', name: '教师节', cls: 'bg-purple-50/90 text-purple-500' },
  '10-01': { emoji: '🇨🇳', name: '国庆节', cls: 'bg-red-50/90 text-red-600' }
}

/** 农历节日对照表：key 为 YYYY-MM-DD */
const LUNAR_FESTIVALS: Record<string, Festival> = {
  // 除夕
  '2024-02-09': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  '2025-01-28': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  '2026-02-16': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  '2027-02-05': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  '2028-01-25': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  '2029-02-12': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  '2030-02-02': { emoji: '🎆', name: '除夕', cls: 'bg-red-50/90 text-red-500' },
  // 春节（正月初一）
  '2024-02-10': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  '2025-01-29': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  '2026-02-17': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  '2027-02-06': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  '2028-01-26': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  '2029-02-13': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  '2030-02-03': { emoji: '🧧', name: '春节', cls: 'bg-red-100/90 text-red-600' },
  // 元宵节（正月十五）
  '2024-02-24': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  '2025-02-12': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  '2026-03-03': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  '2027-02-20': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  '2028-02-09': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  '2029-02-27': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  '2030-02-17': { emoji: '🏮', name: '元宵节', cls: 'bg-orange-50/90 text-orange-500' },
  // 清明节
  '2024-04-04': { emoji: '🌱', name: '清明节', cls: 'bg-emerald-50/90 text-emerald-600' },
  '2025-04-04': { emoji: '🌱', name: '清明节', cls: 'bg-emerald-50/90 text-emerald-600' },
  '2026-04-05': { emoji: '🌱', name: '清明节', cls: 'bg-emerald-50/90 text-emerald-600' },
  '2027-04-05': { emoji: '🌱', name: '清明节', cls: 'bg-emerald-50/90 text-emerald-600' },
  '2028-04-04': { emoji: '🌱', name: '清明节', cls: 'bg-emerald-50/90 text-emerald-600' },
  // 端午节（五月初五）
  '2024-06-10': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  '2025-05-31': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  '2026-06-19': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  '2027-06-09': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  '2028-05-28': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  '2029-06-16': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  '2030-06-05': { emoji: '🐉', name: '端午节', cls: 'bg-teal-50/90 text-teal-600' },
  // 七夕（七月初七）
  '2024-08-10': { emoji: '💗', name: '七夕', cls: 'bg-pink-50/90 text-pink-500' },
  '2025-08-29': { emoji: '💗', name: '七夕', cls: 'bg-pink-50/90 text-pink-500' },
  '2026-08-19': { emoji: '💗', name: '七夕', cls: 'bg-pink-50/90 text-pink-500' },
  '2027-08-08': { emoji: '💗', name: '七夕', cls: 'bg-pink-50/90 text-pink-500' },
  '2028-08-26': { emoji: '💗', name: '七夕', cls: 'bg-pink-50/90 text-pink-500' },
  // 中秋节（八月十五）
  '2024-09-17': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  '2025-10-06': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  '2026-09-25': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  '2027-09-15': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  '2028-10-03': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  '2029-09-22': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  '2030-09-12': { emoji: '🥮', name: '中秋节', cls: 'bg-amber-50/90 text-amber-600' },
  // 重阳节（九月初九）
  '2024-10-11': { emoji: '🍂', name: '重阳节', cls: 'bg-amber-50/90 text-amber-700' },
  '2025-10-29': { emoji: '🍂', name: '重阳节', cls: 'bg-amber-50/90 text-amber-700' },
  '2026-10-18': { emoji: '🍂', name: '重阳节', cls: 'bg-amber-50/90 text-amber-700' },
  '2027-10-08': { emoji: '🍂', name: '重阳节', cls: 'bg-amber-50/90 text-amber-700' }
}

/** 获取某天的节日信息，无节日返回 null */
export function getFestival(dateStr: string): Festival | null {
  return LUNAR_FESTIVALS[dateStr] ?? SOLAR_FESTIVALS[dateStr.slice(5)] ?? null
}
