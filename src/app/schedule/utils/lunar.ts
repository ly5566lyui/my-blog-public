// 农历工具：基于 chinese-lunar 库，提供公历↔农历转换、节气查询
import { solarToLunar, getTerm } from 'chinese-lunar'

export interface LunarInfo {
  year: number
  month: number
  day: number
  monthStr: string
  dayStr: string
  isLeapMonth: boolean
}

const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']

/** 公历 → 农历 */
export function toLunar(date: Date): LunarInfo {
  const lunar = solarToLunar(date)
  return {
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    monthStr: MONTH_NAMES[lunar.month - 1] + '月',
    dayStr: DAY_NAMES[lunar.day - 1],
    isLeapMonth: lunar.isLeapMonth ?? false
  }
}

/** 获取当天农历日期字符串（如"六月十六"） */
export function getLunarDayStr(date: Date): string {
  const lunar = toLunar(date)
  return lunar.dayStr
}

/** 获取当天是否为节气，返回节气信息 */
export interface SolarTermInfo {
  name: string
  icon: string // lucide icon name
}

const SOLAR_TERMS: { name: string; icon: string }[] = [
  { name: '小寒', icon: 'Snowflake' },
  { name: '大寒', icon: 'Snowflake' },
  { name: '立春', icon: 'Leaf' },
  { name: '雨水', icon: 'CloudRain' },
  { name: '惊蛰', icon: 'Bug' },
  { name: '春分', icon: 'Sun' },
  { name: '清明', icon: 'TreePine' },
  { name: '谷雨', icon: 'CloudDrizzle' },
  { name: '立夏', icon: 'Flower' },
  { name: '小满', icon: 'Wheat' },
  { name: '芒种', icon: 'Wheat' },
  { name: '夏至', icon: 'Sun' },
  { name: '小暑', icon: 'Thermometer' },
  { name: '大暑', icon: 'ThermometerSun' },
  { name: '立秋', icon: 'Leaf' },
  { name: '处暑', icon: 'Wind' },
  { name: '白露', icon: 'Droplets' },
  { name: '秋分', icon: 'Sun' },
  { name: '寒露', icon: 'Droplets' },
  { name: '霜降', icon: 'Snowflake' },
  { name: '立冬', icon: 'Snowflake' },
  { name: '小雪', icon: 'Snowflake' },
  { name: '大雪', icon: 'Snowflake' },
  { name: '冬至', icon: 'Snowflake' }
]

export function getSolarTerm(date: Date): SolarTermInfo | null {
  const termIndex = getTerm(date)
  if (termIndex >= 0 && termIndex < SOLAR_TERMS.length) {
    return SOLAR_TERMS[termIndex]
  }
  return null
}
